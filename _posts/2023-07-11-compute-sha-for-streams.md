---
published: true
title: Compute SHA hash for streams
description: A true story of how you should not compute SHA-256 hash for streams
layout: post
tags: [csharp]
comments: true
---

We have a generic logic to log all requests towards API. Due to security reasons, we cannot log the request body because it can contain sensitive data or personal identifiable information (PII) such as customer emails, names, passwords, etc. To distinguish requests, we have decided to hash a request body with SHA-256 and save the hash in logs. But in some cases, I started to see the same hash `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` for different requests.

## Problem

It is an easy task to compute SHA-256 in C#.

```csharp
public string ComputeSha256(MemoryStream stream)
{
    using var sha = SHA256.Create();
    return string.Join("", sha.ComputeHash(stream).Select(b => b.ToString("x2")));
}
```

`MemoryStream` is where a request body is located.

The following unit test proves it works as expected.

```csharp
[TestCase("John Doe", "6cea57c2fb6cbc2a40411135005760f241fffc3e5e67ab99882726431037f908")]
[TestCase("C# developer", "c9298659b4622ec5881c09fc510f23fcfbe75159d13f64b388b74c4d060d65d7")]
public void It_should_compute_SHA256_for_stream(string payload, string expected)
{
    // Given
    var binary = Encoding.UTF8.GetBytes(payload);
    var stream = new MemoryStream(binary);

    // When
    var actual = ComputeSha256(stream);

    // Then
    Assert.That(actual, Is.EqualTo(expected));
}
```

So how come, in some cases, it returns `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`?

## Solution

Once I [googled for `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`](https://www.google.com/search?q=%22e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855%22){:target="_blank"} and found that the hash is for an empty string, it dawned on me that I forgot to rewind the stream 🤦‍♂️

I have rewound to the beginning, and it fixed the issue.

```csharp
public string ComputeSha256(MemoryStream stream)
{
    stream.Seek(0, SeekOrigin.Begin);
    using var sha = SHA256.Create();
    return string.Join("", sha.ComputeHash(stream).Select(b => b.ToString("x2")));
}
```

Also, the test is updated to catch this edge case.

```csharp
[TestCase("John Doe", "6cea57c2fb6cbc2a40411135005760f241fffc3e5e67ab99882726431037f908")]
[TestCase("C# developer", "c9298659b4622ec5881c09fc510f23fcfbe75159d13f64b388b74c4d060d65d7")]
public void It_should_compute_SHA256_for_stream(string payload, string expected)
{
    // Given
    var binary = Encoding.UTF8.GetBytes(payload);
    var stream = new MemoryStream();
    stream.Write(binary);

    // When
    var actual = ComputeSha256(stream);

    // Then
    Assert.That(actual, Is.EqualTo(expected));
}
```

## Takeaways

Don't forget to `Seek(0, SeekOrigin.Begin)` a stream before reading it.

Source code is [on Gaev.Blog.Sha256ForStream to play](https://github.com/gaevoy/Gaev.Blog.Examples/blob/3.3.0/Gaev.Blog.Sha256ForStream/CryptoUtilsTests.cs){:target="_blank"}.
