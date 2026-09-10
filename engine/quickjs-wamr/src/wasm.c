#include "wasm.h"

#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "wasm_export.h"

#ifndef countof
#define countof(x) (sizeof(x) / sizeof((x)[0]))
#endif

#define AIBP_WASM_ERROR_BUF 256
#define AIBP_WASM_MAX_ARGS 16
#define AIBP_WASM_STACK_SIZE (64 * 1024)

typedef struct {
    wasm_module_t module;
    uint8_t *bytes;
    size_t size;
} AibpWasmModule;

typedef struct {
    wasm_module_inst_t inst;
    wasm_exec_env_t exec_env;
    JSValue module_obj;
} AibpWasmInstance;

static JSClassID aibp_wasm_module_class_id;
static JSClassID aibp_wasm_instance_class_id;
static bool aibp_wamr_ready = false;

static void aibp_wasm_module_finalizer(JSRuntime *rt, JSValue val) {
    AibpWasmModule *m = JS_GetOpaque(val, aibp_wasm_module_class_id);
    if (!m) {
        return;
    }
    if (m->module) {
        wasm_runtime_unload(m->module);
    }
    js_free_rt(rt, m->bytes);
    js_free_rt(rt, m);
}

static void aibp_wasm_instance_finalizer(JSRuntime *rt, JSValue val) {
    AibpWasmInstance *i = JS_GetOpaque(val, aibp_wasm_instance_class_id);
    if (!i) {
        return;
    }
    if (i->exec_env) {
        wasm_runtime_destroy_exec_env(i->exec_env);
    }
    if (i->inst) {
        wasm_runtime_deinstantiate(i->inst);
    }
    JS_FreeValueRT(rt, i->module_obj);
    js_free_rt(rt, i);
}

static void aibp_wasm_instance_mark(JSRuntime *rt, JSValue val, JS_MarkFunc *mark_func) {
    AibpWasmInstance *i = JS_GetOpaque(val, aibp_wasm_instance_class_id);
    if (i) {
        JS_MarkValue(rt, i->module_obj, mark_func);
    }
}

static JSClassDef aibp_wasm_module_class = {
    .class_name = "WebAssembly.Module",
    .finalizer = aibp_wasm_module_finalizer,
};

static JSClassDef aibp_wasm_instance_class = {
    .class_name = "WebAssembly.Instance",
    .finalizer = aibp_wasm_instance_finalizer,
    .gc_mark = aibp_wasm_instance_mark,
};

static bool aibp_read_wasm_bytes(JSContext *ctx, JSValueConst val, uint8_t **out, size_t *out_size) {
    size_t size = 0;
    uint8_t *buf = JS_GetUint8Array(ctx, &size, val);
    if (buf) {
        *out = buf;
        *out_size = size;
        return true;
    }
    JS_FreeValue(ctx, JS_GetException(ctx));

    buf = JS_GetArrayBuffer(ctx, &size, val);
    if (buf) {
        *out = buf;
        *out_size = size;
        return true;
    }
    JS_FreeValue(ctx, JS_GetException(ctx));

    size_t offset = 0;
    size_t asize = 0;
    JSValue abuf = JS_GetTypedArrayBuffer(ctx, val, &offset, &asize, NULL);
    if (JS_IsException(abuf)) {
        return false;
    }
    buf = JS_GetArrayBuffer(ctx, &size, abuf);
    JS_FreeValue(ctx, abuf);
    if (!buf) {
        JS_FreeValue(ctx, JS_GetException(ctx));
        JS_ThrowTypeError(ctx, "WebAssembly.Module: argument must be a BufferSource");
        return false;
    }
    *out = buf + offset;
    *out_size = asize;
    return true;
}

static JSValue aibp_throw_wasm(JSContext *ctx, const char *name, const char *message) {
    JSValue err = JS_NewError(ctx);
    JS_DefinePropertyValueStr(ctx, err, "name", JS_NewString(ctx, name), JS_PROP_WRITABLE | JS_PROP_CONFIGURABLE);
    JS_DefinePropertyValueStr(ctx, err, "message", JS_NewString(ctx, message ? message : name),
                              JS_PROP_WRITABLE | JS_PROP_CONFIGURABLE);
    return JS_Throw(ctx, err);
}

static bool aibp_js_to_wasm_val(JSContext *ctx, JSValueConst js, wasm_valkind_t kind, wasm_val_t *out) {
    out->kind = kind;
    switch (kind) {
    case WASM_I32: {
        int32_t v = 0;
        if (JS_ToInt32(ctx, &v, js)) {
            return false;
        }
        out->of.i32 = v;
        return true;
    }
    case WASM_I64: {
        int64_t v = 0;
        if (JS_ToInt64Ext(ctx, &v, js)) {
            return false;
        }
        out->of.i64 = v;
        return true;
    }
    case WASM_F32: {
        double v = 0;
        if (JS_ToFloat64(ctx, &v, js)) {
            return false;
        }
        out->of.f32 = (float)v;
        return true;
    }
    case WASM_F64: {
        double v = 0;
        if (JS_ToFloat64(ctx, &v, js)) {
            return false;
        }
        out->of.f64 = v;
        return true;
    }
    default:
        JS_ThrowTypeError(ctx, "unsupported wasm value type");
        return false;
    }
}

static JSValue aibp_wasm_to_js_val(JSContext *ctx, const wasm_val_t *val) {
    switch (val->kind) {
    case WASM_I32:
        return JS_NewInt32(ctx, val->of.i32);
    case WASM_I64:
        return JS_NewBigInt64(ctx, val->of.i64);
    case WASM_F32:
        return JS_NewFloat64(ctx, val->of.f32);
    case WASM_F64:
        return JS_NewFloat64(ctx, val->of.f64);
    default:
        return JS_ThrowTypeError(ctx, "unsupported wasm result type");
    }
}

static JSValue aibp_export_call(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv, int magic,
                                JSValueConst *func_data) {
    (void)this_val;
    (void)magic;
    AibpWasmInstance *inst = JS_GetOpaque2(ctx, func_data[0], aibp_wasm_instance_class_id);
    if (!inst) {
        return JS_EXCEPTION;
    }
    const char *name = JS_ToCString(ctx, func_data[1]);
    if (!name) {
        return JS_EXCEPTION;
    }
    wasm_function_inst_t func = wasm_runtime_lookup_function(inst->inst, name);
    JS_FreeCString(ctx, name);
    if (!func) {
        return aibp_throw_wasm(ctx, "TypeError", "exported function not found");
    }

    uint32_t param_count = wasm_func_get_param_count(func, inst->inst);
    uint32_t result_count = wasm_func_get_result_count(func, inst->inst);
    if (param_count > AIBP_WASM_MAX_ARGS || result_count > AIBP_WASM_MAX_ARGS) {
        return aibp_throw_wasm(ctx, "RuntimeError", "too many wasm parameters or results");
    }

    wasm_valkind_t param_types[AIBP_WASM_MAX_ARGS];
    if (param_count > 0) {
        wasm_func_get_param_types(func, inst->inst, param_types);
    }
    wasm_val_t params[AIBP_WASM_MAX_ARGS];
    for (uint32_t i = 0; i < param_count; i++) {
        JSValueConst src = i < (uint32_t)argc ? argv[i] : JS_UNDEFINED;
        if (!aibp_js_to_wasm_val(ctx, src, param_types[i], &params[i])) {
            return JS_EXCEPTION;
        }
    }

    wasm_val_t results[AIBP_WASM_MAX_ARGS];
    if (!wasm_runtime_call_wasm_a(inst->exec_env, func, result_count, results, param_count, params)) {
        const char *exception = wasm_runtime_get_exception(inst->inst);
        JSValue err = aibp_throw_wasm(ctx, "RuntimeError", exception ? exception : "wasm call failed");
        wasm_runtime_clear_exception(inst->inst);
        return err;
    }

    if (result_count == 0) {
        return JS_UNDEFINED;
    }
    if (result_count == 1) {
        return aibp_wasm_to_js_val(ctx, &results[0]);
    }
    JSValue arr = JS_NewArray(ctx);
    for (uint32_t i = 0; i < result_count; i++) {
        JSValue v = aibp_wasm_to_js_val(ctx, &results[i]);
        if (JS_IsException(v)) {
            JS_FreeValue(ctx, arr);
            return v;
        }
        JS_SetPropertyUint32(ctx, arr, i, v);
    }
    return arr;
}

static JSValue aibp_wrap_exports(JSContext *ctx, JSValue instance_obj, AibpWasmModule *mod, AibpWasmInstance *inst) {
    JSValue exports = JS_NewObject(ctx);
    int32_t count = wasm_runtime_get_export_count(mod->module);
    for (int32_t i = 0; i < count; i++) {
        wasm_export_t exp;
        wasm_runtime_get_export_type(mod->module, i, &exp);
        if (exp.kind != WASM_IMPORT_EXPORT_KIND_FUNC || !exp.name) {
            continue;
        }
        JSValue data[2];
        data[0] = instance_obj;
        data[1] = JS_NewString(ctx, exp.name);
        if (JS_IsException(data[1])) {
            JS_FreeValue(ctx, exports);
            return JS_EXCEPTION;
        }
        JSValue fn = JS_NewCFunctionData(ctx, aibp_export_call, 0, 0, 2, data);
        JS_FreeValue(ctx, data[1]);
        if (JS_IsException(fn)) {
            JS_FreeValue(ctx, exports);
            return fn;
        }
        JS_DefinePropertyValueStr(ctx, exports, exp.name, fn, JS_PROP_C_W_E);
    }
    return exports;
}

static JSValue aibp_module_ctor(JSContext *ctx, JSValueConst new_target, int argc, JSValueConst *argv) {
    (void)new_target;
    if (argc < 1) {
        return JS_ThrowTypeError(ctx, "WebAssembly.Module requires a BufferSource");
    }
    uint8_t *src = NULL;
    size_t size = 0;
    if (!aibp_read_wasm_bytes(ctx, argv[0], &src, &size)) {
        return JS_EXCEPTION;
    }
    if (size == 0) {
        return JS_ThrowTypeError(ctx, "WebAssembly.Module: empty buffer");
    }

    AibpWasmModule *m = js_mallocz(ctx, sizeof(*m));
    if (!m) {
        return JS_EXCEPTION;
    }
    m->bytes = js_malloc(ctx, size);
    if (!m->bytes) {
        js_free(ctx, m);
        return JS_EXCEPTION;
    }
    memcpy(m->bytes, src, size);
    m->size = size;

    char error_buf[AIBP_WASM_ERROR_BUF];
    error_buf[0] = 0;
    m->module = wasm_runtime_load(m->bytes, (uint32_t)size, error_buf, sizeof(error_buf));
    if (!m->module) {
        js_free(ctx, m->bytes);
        js_free(ctx, m);
        return aibp_throw_wasm(ctx, "CompileError", error_buf[0] ? error_buf : "failed to compile wasm module");
    }

    JSValue obj = JS_NewObjectClass(ctx, aibp_wasm_module_class_id);
    if (JS_IsException(obj)) {
        wasm_runtime_unload(m->module);
        js_free(ctx, m->bytes);
        js_free(ctx, m);
        return obj;
    }
    JS_SetOpaque(obj, m);
    return obj;
}

static JSValue aibp_instance_ctor(JSContext *ctx, JSValueConst new_target, int argc, JSValueConst *argv) {
    (void)new_target;
    if (argc < 1) {
        return JS_ThrowTypeError(ctx, "WebAssembly.Instance requires a Module");
    }
    AibpWasmModule *mod = JS_GetOpaque2(ctx, argv[0], aibp_wasm_module_class_id);
    if (!mod || !mod->module) {
        return JS_ThrowTypeError(ctx, "WebAssembly.Instance: first argument must be a WebAssembly.Module");
    }

    char error_buf[AIBP_WASM_ERROR_BUF];
    error_buf[0] = 0;
    wasm_module_inst_t inst = wasm_runtime_instantiate(mod->module, AIBP_WASM_STACK_SIZE, 0, error_buf, sizeof(error_buf));
    if (!inst) {
        return aibp_throw_wasm(ctx, "LinkError", error_buf[0] ? error_buf : "failed to instantiate wasm module");
    }
    wasm_exec_env_t exec_env = wasm_runtime_create_exec_env(inst, AIBP_WASM_STACK_SIZE);
    if (!exec_env) {
        wasm_runtime_deinstantiate(inst);
        return aibp_throw_wasm(ctx, "LinkError", "failed to create wasm exec env");
    }

    AibpWasmInstance *opaque = js_mallocz(ctx, sizeof(*opaque));
    if (!opaque) {
        wasm_runtime_destroy_exec_env(exec_env);
        wasm_runtime_deinstantiate(inst);
        return JS_EXCEPTION;
    }
    opaque->inst = inst;
    opaque->exec_env = exec_env;
    opaque->module_obj = JS_DupValue(ctx, argv[0]);

    JSValue obj = JS_NewObjectClass(ctx, aibp_wasm_instance_class_id);
    if (JS_IsException(obj)) {
        wasm_runtime_destroy_exec_env(exec_env);
        wasm_runtime_deinstantiate(inst);
        JS_FreeValue(ctx, opaque->module_obj);
        js_free(ctx, opaque);
        return obj;
    }
    JS_SetOpaque(obj, opaque);

    JSValue exports = aibp_wrap_exports(ctx, obj, mod, opaque);
    if (JS_IsException(exports)) {
        JS_FreeValue(ctx, obj);
        return exports;
    }
    JS_DefinePropertyValueStr(ctx, obj, "exports", exports, JS_PROP_C_W_E);
    return obj;
}

void js_std_dump_error(JSContext *ctx) {
    (void)ctx;
}

bool QTS_DetectModule(const char *input, size_t input_len) {
    size_t i = 0;
    while (i < input_len) {
        char c = input[i];
        if (c == ' ' || c == '\t' || c == '\n' || c == '\r') {
            i++;
            continue;
        }
        if (c == '/' && i + 1 < input_len && input[i + 1] == '/') {
            i += 2;
            while (i < input_len && input[i] != '\n') {
                i++;
            }
            continue;
        }
        if (c == '/' && i + 1 < input_len && input[i + 1] == '*') {
            i += 2;
            while (i + 1 < input_len && !(input[i] == '*' && input[i + 1] == '/')) {
                i++;
            }
            i = i + 2 < input_len ? i + 2 : input_len;
            continue;
        }
        break;
    }
    if (i + 6 <= input_len && memcmp(input + i, "import", 6) == 0) {
        return true;
    }
    if (i + 6 <= input_len && memcmp(input + i, "export", 6) == 0) {
        return true;
    }
    return false;
}

void aibp_wasm_install(JSContext *ctx) {
    if (!aibp_wamr_ready) {
        if (!wasm_runtime_init()) {
            fprintf(stderr, "aibp: wasm_runtime_init failed\n");
            return;
        }
        aibp_wamr_ready = true;
    }

    JSRuntime *rt = JS_GetRuntime(ctx);
    if (aibp_wasm_module_class_id == 0) {
        JS_NewClassID(rt, &aibp_wasm_module_class_id);
        JS_NewClassID(rt, &aibp_wasm_instance_class_id);
    }
    if (!JS_IsRegisteredClass(rt, aibp_wasm_module_class_id)) {
        JS_NewClass(rt, aibp_wasm_module_class_id, &aibp_wasm_module_class);
        JS_SetClassProto(ctx, aibp_wasm_module_class_id, JS_NULL);
    }
    if (!JS_IsRegisteredClass(rt, aibp_wasm_instance_class_id)) {
        JS_NewClass(rt, aibp_wasm_instance_class_id, &aibp_wasm_instance_class);
        JS_SetClassProto(ctx, aibp_wasm_instance_class_id, JS_NULL);
    }

    JSValue wasm = JS_NewObject(ctx);
    JSValue module_ctor = JS_NewCFunction2(ctx, aibp_module_ctor, "Module", 1, JS_CFUNC_constructor, 0);
    JSValue instance_ctor = JS_NewCFunction2(ctx, aibp_instance_ctor, "Instance", 1, JS_CFUNC_constructor, 0);
    JS_DefinePropertyValueStr(ctx, wasm, "Module", module_ctor, JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, wasm, "Instance", instance_ctor, JS_PROP_C_W_E);

    JSValue global = JS_GetGlobalObject(ctx);
    JS_DefinePropertyValueStr(ctx, global, "WebAssembly", wasm, JS_PROP_C_W_E);
    JS_FreeValue(ctx, global);
}
