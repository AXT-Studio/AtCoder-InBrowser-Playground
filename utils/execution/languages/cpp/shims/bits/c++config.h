#ifndef _AIBP_GLIBCXX_CXXCONFIG_H
#define _AIBP_GLIBCXX_CXXCONFIG_H 1

#define _GLIBCXX_VISIBILITY(V)
#define _GLIBCXX_BEGIN_NAMESPACE_VERSION
#define _GLIBCXX_END_NAMESPACE_VERSION
#define _GLIBCXX_PSEUDO_VISIBILITY(V)
#define _GLIBCXX_NOTHROW noexcept
#define _GLIBCXX_NOEXCEPT noexcept
#define _GLIBCXX_USE_NOEXCEPT noexcept
#define _GLIBCXX_NOEXCEPT_IF(...) noexcept(__VA_ARGS__)
#define _GLIBCXX_NOEXCEPT_PARM
#define _GLIBCXX_NOEXCEPT_QUAL noexcept
#define _GLIBCXX_CONSTEXPR constexpr
#define _GLIBCXX_USE_CONSTEXPR constexpr
#define _GLIBCXX14_CONSTEXPR constexpr
#define _GLIBCXX17_CONSTEXPR constexpr
#define _GLIBCXX20_CONSTEXPR constexpr
#define _GLIBCXX23_CONSTEXPR constexpr
#define _GLIBCXX17_INLINE inline
#define _GLIBCXX_STD_A std
#define _GLIBCXX_STD_C std
#define _GLIBCXX_USE_ALLOC_NOEXCEPT
#define _GLIBCXX_BEGIN_NAMESPACE_ALGO
#define _GLIBCXX_END_NAMESPACE_ALGO
#define _GLIBCXX_BEGIN_NAMESPACE_CONTAINER
#define _GLIBCXX_END_NAMESPACE_CONTAINER
#define _GLIBCXX_BEGIN_NAMESPACE_LDBL
#define _GLIBCXX_END_NAMESPACE_LDBL
#define _GLIBCXX_BEGIN_EXTERN_C extern "C" {
#define _GLIBCXX_END_EXTERN_C }
#define __N(msgid) (msgid)
#define _GLIBCXX_WEAK_DEFINITION
#define _GLIBCXX_CONST
#define _GLIBCXX_PURE
#define _GLIBCXX_NORETURN __attribute__((__noreturn__))
#define _GLIBCXX_NODISCARD
#define _GLIBCXX_DEPRECATED
#define _GLIBCXX_ABI_TAG_CXX11
#define _GLIBCXX_NAMESPACE_CXX11
#define _GLIBCXX_BEGIN_NAMESPACE_CXX11
#define _GLIBCXX_END_NAMESPACE_CXX11
#define _GLIBCXX_CAN_INLINE
#ifndef _GLIBCXX_USE_ALLOCATOR_NEW
#define _GLIBCXX_USE_ALLOCATOR_NEW 1
#endif
#define _GLIBCXX_SYNCHRONIZATION_HAPPENS_BEFORE(A)
#define _GLIBCXX_SYNCHRONIZATION_HAPPENS_AFTER(A)
#if __cpp_exceptions
#define __try try
#define __catch(X) catch (X)
#define __throw_exception_again throw
#define _GLIBCXX_THROW_OR_ABORT(_EXC) (throw(_EXC))
#else
#define __try if (true)
#define __catch(X) if (false)
#define __throw_exception_again
#define _GLIBCXX_THROW_OR_ABORT(_EXC) (__builtin_abort())
#endif
#define __glibcxx_assert(cond)
#define _GLIBCXX_DEBUG_ASSERT(cond)
#define _GLIBCXX_DEBUG_ONLY(expr)

#endif
