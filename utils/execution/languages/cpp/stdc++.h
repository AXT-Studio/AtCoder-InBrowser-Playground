// libc++ 向け bits/stdc++.h（GCC の GNU 拡張は含めない）
#include <algorithm>
#include <array>
#include <bitset>
#include <cassert>
#include <cctype>
#include <cerrno>
#include <cfloat>
#include <climits>
#include <clocale>
#include <cmath>
#include <complex>
#include <cstdarg>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <ctime>
#include <cwchar>
#include <cwctype>
#include <deque>
#include <exception>
#include <fstream>
#include <functional>
#include <iomanip>
#include <ios>
#include <iosfwd>
#include <iostream>
#include <istream>
#include <iterator>
#include <limits>
#include <list>
#include <locale>
#include <map>
#include <memory>
#include <new>
#include <numeric>
#include <ostream>
#include <queue>
#include <random>
#include <regex>
#include <set>
#include <sstream>
#include <stack>
#include <stdexcept>
#include <streambuf>
#include <string>
#include <typeinfo>
#include <utility>
#include <valarray>
#include <vector>

#if __cplusplus >= 201103L
#include <atomic>
#include <chrono>
#include <codecvt>
#include <forward_list>
#include <initializer_list>
#include <ratio>
#include <scoped_allocator>
#include <system_error>
#include <tuple>
#include <type_traits>
#include <typeindex>
#include <unordered_map>
#include <unordered_set>
#if defined(__has_include)
#if __has_include(<condition_variable>)
#include <condition_variable>
#endif
#if __has_include(<future>)
#include <future>
#endif
#if __has_include(<mutex>)
#include <mutex>
#endif
#if __has_include(<thread>)
#include <thread>
#endif
#endif
#endif

#if __cplusplus >= 201402L
#if defined(__has_include)
#if __has_include(<shared_mutex>)
#include <shared_mutex>
#endif
#endif
#endif

#if __cplusplus >= 201703L
#include <any>
#include <charconv>
#include <optional>
#include <string_view>
#include <variant>
#if defined(__has_include)
#if __has_include(<filesystem>)
#include <filesystem>
#endif
#if __has_include(<memory_resource>)
#include <memory_resource>
#endif
#endif
#endif

#if __cplusplus >= 202002L
#if defined(__has_include)
#if __has_include(<barrier>)
#include <barrier>
#endif
#if __has_include(<bit>)
#include <bit>
#endif
#if __has_include(<compare>)
#include <compare>
#endif
#if __has_include(<concepts>)
#include <concepts>
#endif
#if __has_include(<coroutine>)
#include <coroutine>
#endif
#if __has_include(<format>)
#include <format>
#endif
#if __has_include(<latch>)
#include <latch>
#endif
#if __has_include(<numbers>)
#include <numbers>
#endif
#if __has_include(<ranges>)
#include <ranges>
#endif
#if __has_include(<semaphore>)
#include <semaphore>
#endif
#if __has_include(<source_location>)
#include <source_location>
#endif
#if __has_include(<span>)
#include <span>
#endif
#if __has_include(<stop_token>)
#include <stop_token>
#endif
#if __has_include(<syncstream>)
#include <syncstream>
#endif
#if __has_include(<version>)
#include <version>
#endif
#endif
#endif

#if __cplusplus >= 202302L
#if defined(__has_include)
#if __has_include(<expected>)
#include <expected>
#endif
#if __has_include(<flat_map>)
#include <flat_map>
#endif
#if __has_include(<flat_set>)
#include <flat_set>
#endif
#if __has_include(<mdspan>)
#include <mdspan>
#endif
#if __has_include(<print>)
#include <print>
#endif
#if __has_include(<spanstream>)
#include <spanstream>
#endif
#if __has_include(<stacktrace>)
#include <stacktrace>
#endif
#if __has_include(<stdfloat>)
#include <stdfloat>
#endif
#endif
#endif
