cmake_minimum_required(VERSION 3.16)
project(aibp-quickjs-wamr C)

set(CMAKE_C_STANDARD 11)

if(NOT EMSCRIPTEN)
    message(FATAL_ERROR "Configure with emcmake so the toolchain is Emscripten")
endif()

set(ENGINE_DIR ${CMAKE_CURRENT_SOURCE_DIR})
set(QJS_DIR ${ENGINE_DIR}/vendor/quickjs-ng)
set(WAMR_ROOT_DIR ${ENGINE_DIR}/vendor/wamr)

set(WAMR_BUILD_PLATFORM "linux")
set(WAMR_BUILD_TARGET "X86_32")
set(WAMR_BUILD_INTERP 1)
set(WAMR_BUILD_FAST_INTERP 1)
set(WAMR_BUILD_AOT 0)
set(WAMR_BUILD_JIT 0)
set(WAMR_BUILD_FAST_JIT 0)
set(WAMR_BUILD_LIBC_WASI 0)
set(WAMR_BUILD_LIBC_BUILTIN 0)
set(WAMR_BUILD_LIB_PTHREAD 0)
set(WAMR_BUILD_SIMD 1)
set(WAMR_BUILD_BULK_MEMORY 1)
set(WAMR_BUILD_REF_TYPES 1)
set(WAMR_BUILD_MINI_LOADER 0)
set(WAMR_DISABLE_HW_BOUND_CHECK 1)
set(WAMR_BUILD_INVOKE_NATIVE_GENERAL 1)

include(${WAMR_ROOT_DIR}/build-scripts/runtime_lib.cmake)
add_library(vmlib STATIC ${WAMR_RUNTIME_LIB_SOURCE})
target_include_directories(vmlib PUBLIC ${WAMR_ROOT_DIR}/core/iwasm/include)
target_compile_options(vmlib PRIVATE -include ${ENGINE_DIR}/src/wamr-emscripten-compat.h)

set(QJS_VERSION_FILE ${QJS_DIR}/VERSION)
if(EXISTS ${QJS_VERSION_FILE})
    file(READ ${QJS_VERSION_FILE} QJS_VERSION)
    string(STRIP "${QJS_VERSION}" QJS_VERSION)
else()
    set(QJS_VERSION "0.16.2")
endif()

add_executable(emscripten-module
    ${QJS_DIR}/quickjs.c
    ${QJS_DIR}/libregexp.c
    ${QJS_DIR}/libunicode.c
    ${QJS_DIR}/dtoa.c
    ${ENGINE_DIR}/src/interface.c
    ${ENGINE_DIR}/src/wasm.c
)
target_include_directories(emscripten-module PRIVATE
    ${QJS_DIR}
    ${ENGINE_DIR}/src
    ${WAMR_ROOT_DIR}/core/iwasm/include
)
target_compile_definitions(emscripten-module PRIVATE
    _GNU_SOURCE
    QTS_USE_QUICKJS_NG
    CONFIG_VERSION="${QJS_VERSION}"
)
target_compile_options(emscripten-module PRIVATE -Oz -include ${ENGINE_DIR}/src/wamr-emscripten-compat.h)
target_link_libraries(emscripten-module PRIVATE vmlib)

set(SYMBOLS_JSON ${CMAKE_CURRENT_BINARY_DIR}/symbols.json)
add_custom_command(
    OUTPUT ${SYMBOLS_JSON}
    COMMAND ${CMAKE_COMMAND} -E env node ${ENGINE_DIR}/scripts/gen-symbols.mjs ${SYMBOLS_JSON}
    DEPENDS ${ENGINE_DIR}/src/interface.c ${ENGINE_DIR}/scripts/gen-symbols.mjs
    COMMENT "Generate Emscripten EXPORTED_FUNCTIONS from QTS_* decls"
)
add_custom_target(aibp-symbols DEPENDS ${SYMBOLS_JSON})
add_dependencies(emscripten-module aibp-symbols)

target_link_options(emscripten-module PRIVATE
    -Oz
    -flto
    --no-entry
    -sMODULARIZE=1
    -sEXPORT_ES6=1
    -sEXPORT_NAME=QuickJSRaw
    # Runner is a Worker. Vitest/Node loads bytes via instantiateWasm, so node glue is unused.
    -sENVIRONMENT=web,worker
    -sINVOKE_RUN=0
    -sALLOW_MEMORY_GROWTH=1
    -sALLOW_TABLE_GROWTH=1
    -sSTACK_SIZE=5MB
    -sFILESYSTEM=0
    -sALLOW_UNIMPLEMENTED_SYSCALLS=1
    -sAUTO_JS_LIBRARIES=0
    -sAUTO_NATIVE_LIBRARIES=0
    -sDEFAULT_TO_CXX=0
    -sNO_EXIT_RUNTIME=1
    -sEXPORTED_RUNTIME_METHODS=cwrap,stringToUTF8,lengthBytesUTF8,UTF8ToString,HEAPU8,HEAP8
    -sEXPORTED_FUNCTIONS=@${SYMBOLS_JSON}
)

set_target_properties(emscripten-module PROPERTIES
    OUTPUT_NAME emscripten-module
    SUFFIX .mjs
    RUNTIME_OUTPUT_DIRECTORY ${ENGINE_DIR}/dist
)
