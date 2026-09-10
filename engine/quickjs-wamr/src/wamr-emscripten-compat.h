#ifndef AIBP_WAMR_EMSCRIPTEN_COMPAT_H
#define AIBP_WAMR_EMSCRIPTEN_COMPAT_H

/* Emscripten already ships wasi/api.h. Skip WAMR's duplicate typedefs. */
#ifndef _PLATFORM_WASI_TYPES_H
#define _PLATFORM_WASI_TYPES_H
#include <wasi/api.h>
#endif

#endif
