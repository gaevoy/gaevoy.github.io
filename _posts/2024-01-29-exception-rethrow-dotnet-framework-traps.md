---
published: true
title: Exception Rethrow traps in .NET Framework
description: Explore the nuances of exception rethrowing in .NET Framework with my in-depth analysis. Learn about the challenges of preserving stack traces and discover effective solutions like ExceptionDispatchInfo. Ideal for .NET developers seeking practical insights.
layout: post
tags: [dotnet, dotnet-core, csharp, exception]
comments: true
---

In my investigation of a production issue in a `.NET Framework` application, I faced a challenge while trying to match the stack trace from error logs to the source code.  Despite `.NET` documentation stating [to keep the original stack trace information with the exception, use the throw statement without specifying the exception](https://learn.microsoft.com/dotnet/fundamentals/code-analysis/quality-rules/ca2200){:target="_blank"}, my logs only showed a line with `throw;`. This led me to question: why can't I see the original line of code where the exception occurred?

## Problem

To understand this better, I conducted a unit test. The test revealed that the stack trace pointed to a different line than expected.

![Stacktrace should point to exception line](/img/exeption-rethrow/stacktrace_should_point_to_exception_line.png "Stacktrace should point to exception line" ){:style="max-width:1592px; width:100%;" class="block-center"}

It pointed to line `22` instead of the anticipated line `18`.

```
System.Exception : Exception of type 'System.Exception' was thrown.
   at ExceptionRethrowTests.Stacktrace_should_point_to_exception_line() in ExceptionRethrowTests.cs:line 22
```

To explore further, I wrapped the throwing logic in a method and used `[MethodImpl(NoInlining)]` to prevent `.NET` from inlining the method.

![Stacktrace should point to exception line of validate method](/img/exeption-rethrow/stacktrace_should_point_to_exception_line_of_validate_method.png "Stacktrace should point to exception line of validate method" ){:style="max-width:1592px; width:100%;" class="block-center"}

The results were partially correct, showing the original `throw new Exception();` line `32`, but missing a pointer to another expected line `37`.

```
System.Exception : Exception of type 'System.Exception' was thrown.
   at ExceptionRethrowTests.<Stacktrace_should_point_to_exception_line_of_validate_method>g__Validate|1_0() in ExceptionRethrowTests.cs:line 32
   at ExceptionRethrowTests.Stacktrace_should_point_to_exception_line_of_validate_method() in ExceptionRethrowTests.cs:line 41
```

Further experimentation with `[MethodImpl(AggressiveInlining)]` to simulate inlining by `.NET`.

![Stacktrace should point to exception line of inlined validate method](/img/exeption-rethrow/stacktrace_should_point_to_exception_line_of_inlined_validate_method.png "Stacktrace should point to exception line of inlined validate method" ){:style="max-width:1592px; width:100%;" class="block-center"}

Led back to the `throw;` line `60`, not revealing the original exception source.

```
System.Exception : Exception of type 'System.Exception' was thrown.
   at ExceptionRethrowTests.Stacktrace_should_point_to_exception_line_of_inlined_validate_method() in ExceptionRethrowTests.cs:line 60
```

Searching online, I found an explanation:

> This is actually a limitation in the thread exception handling plumbing inside the CLR. It piggy-backs on top of Windows SEH support. Which is stack frame based, there is only one for a method. You always lose the original throw location in your sample code. Throw the exception from a method you call to see the difference — [Hans Passant](https://stackoverflow.com/questions/20147929/throw-and-preserve-stack-trace-not-as-expected-as-described-by-code-analysis#comment30034548_20147929){:target="_blank"}

## Solution

Interestingly, in newer versions of `.NET` like `6`, `7`, and `8`, rethrowing works as expected. However, in the `.NET Framework`, an ugly workaround is needed to preserve the stack trace. This can be done using `ExceptionDispatchInfo.Capture(ex).Throw();` which effectively maintains the original stack trace (see [StackOverflow topic](https://stackoverflow.com/a/29218109/1400547){:target="_blank"}).

![Stacktrace should point to exception line with net framework fix](/img/exeption-rethrow/stacktrace_should_point_to_exception_line_with_net_framework_fix.png "Stacktrace should point to exception line with net framework fix" ){:style="max-width:1592px; width:100%;" class="block-center"}

And now stacktrace points to the line `69`, which is original `throw new Exception();`

```
System.Exception : Exception of type 'System.Exception' was thrown.
   at ExceptionRethrowTests.Stacktrace_should_point_to_exception_line_with_net_framework_fix() in ExceptionRethrowTests.cs:line 69
--- End of stack trace from previous location where exception was thrown ---
   at System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()
   at ExceptionRethrowTests.Stacktrace_should_point_to_exception_line_with_net_framework_fix() in ExceptionRethrowTests.cs:line 74

```

## Frequently Asked Questions

### What is exception rethrowing in the .NET Framework?

Exception rethrowing in the .NET Framework refers to the practice of catching an exception and then throwing it again, usually to preserve the original error information while allowing for additional handling or logging.

### Why is preserving the stack trace important in exception rethrowing?

Preserving the stack trace is crucial because it provides the sequence of method calls that led to the exception. This information is invaluable for debugging and understanding the context of an error.

### What issue does this article address about exception rethrowing in .NET?

The article discusses a common problem in the .NET Framework where rethrowing an exception does not always maintain the original stack trace, complicating error diagnosis.

### How does the .NET Framework typically handle exception rethrowing?

In the .NET Framework, using the `throw` statement without specifying the exception is supposed to keep the original stack trace. However, this article reveals scenarios where this does not hold true.

### Does this stack trace issue occur in newer versions of .NET?

No, this stack trace issue is specific to the .NET Framework. Newer versions of .NET, such as .NET 6, 7, and 8, handle exception rethrowing as expected.

### Are there performance implications when using the suggested workaround?

The workaround may have some performance implications, but they are typically minimal compared to the benefit of accurately tracking down errors.

### Where can I find the unit tests related to this investigation?

The unit tests are available [on Gaev.Blog.ExceptionRethrow](https://github.com/gaevoy/Gaev.Blog.Examples/blob/3.7.0/Gaev.Blog.ExceptionRethrow/ExceptionRethrowTests.cs){:target="_blank"}.

### Why is it important for developers to understand this issue?

Understanding this issue is vital for developers to ensure accurate error logging and effective debugging, especially in legacy applications using the .NET Framework.

## Conclusion

For developers still using the `.NET Framework`, it's important to revisit rethrowing approach to ensure the original stack trace is preserved. This can be particularly crucial for accurate error logging and debugging.

You can find all the unit tests conducted for this investigation [on Gaev.Blog.ExceptionRethrow](https://github.com/gaevoy/Gaev.Blog.Examples/blob/3.7.0/Gaev.Blog.ExceptionRethrow/ExceptionRethrowTests.cs){:target="_blank"}.

This discovery underscores the importance of staying updated with framework behaviors, especially when dealing with error handling and debugging. If you found this information helpful, feel free to share and comment with your own experiences or insights. Let's continue to learn and grow in our software development journey together.
