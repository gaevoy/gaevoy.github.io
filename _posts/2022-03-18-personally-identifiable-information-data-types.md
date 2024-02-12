---
published: true
title: .NET type for personally identifiable information (PII)
description: Working with personally identifiable information (PII) with the help of .NET String is painful. In this article, I will show the benefits of introducing explicit .NET type via PiiString instead of .NET String.
layout: post
tags: [security, pii, gdpr, dotnet]
comments: true
---

At some point, I started to feel discomfort working with personally identifiable information data in our project. Mostly, because it is a relatively new field and not always straightforward. In this article, I'm going to try to tackle the main issues and make the implicit explicit.

> Personally identifiable information (PII) is any information relating to an identified or identifiable natural person; an identifiable natural person is one who can be identified, directly or indirectly, in particular by reference to an identifier such as a name, an identification number, location data, an online identifier or to one or more factors specific to the physical, physiological, genetic, mental, economic, cultural or social identity of that natural person — [EU GDPR](https://www.privacy-regulation.eu/en/article-4-definitions-GDPR.htm){:target="_blank"}.

Long story short, PII is the user personal data, such as name, email, date of birth, social number, etc.

## Problem

According to [the law in many countries](https://en.wikipedia.org/wiki/Personal_data#Laws_and_standards){:target="_blank"}, you must treat PII data in a special way. For example, there is a number of restrictions on the use of personal data according to [GDPR regulation](https://en.wikipedia.org/wiki/General_Data_Protection_Regulation){:target="_blank"} in the European Union. I'm going to list some requirements based on [the GDPR checklist](https://gdpr.eu/checklist/){:target="_blank"}:

1. Encrypt, pseudonymize, or anonymize personal data wherever possible.
2. Sign a data processing agreement between your organization and any third parties that process personal data on your behalf.
3. It's easy for your customers to request to have their personal data deleted.
4. It's easy for your customers to receive a copy of their personal data in a format that can be easily transferred to another company.

What does this mean for us software engineers? How should this be reflected in the source code?

To meet 1st requirement, PII data should be rendered differently depending on a use case. For example, PII is: 
* plain-text in a user interface;
* pseudonymized in logs;
* encrypted in the CSV export file.

To meet 2nd requirement, a software engineer should be ready for many questions by company lawyers to find out where and why PII is in use.

To meet 3 and 4 requirements, a software engineer should be able to find out what data exactly to delete and export, then implement. This is similar to the 2nd requirement, so I won't go into details later.

Using the .NET `String` type for PII data looks like an obvious way.

```c#
public class User
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
    public string Location { get; set; }
}
```

However, this is not obvious how to encrypt/pseudonymize those values on a case-by-case basis. Moreover, identifying such fields in source code for company lawyers can be tricky.

## Solution

What if we introduce an explicit type for PII, like `PiiString`. The idea is to have `PiiString` type as much interchangeable with `String` as possible to simplify refactoring existing code which uses the `String`. Then, within the application boundary it should behave like usual `String`, however crossing application boundaries it should be encoded/encrypted/hashed.

```c#
public class User
{
    public Guid Id { get; set; }
    public PiiString Name { get; set; }
    public PiiString Email { get; set; }
    public PiiString Location { get; set; }
}
```

Where the `PiiString` is a wrapper around the .NET `String`. Note, below is an oversimplified version, the complete version is [on PiiString](https://github.com/gaevoy/Gaev.Blog.Examples/blob/3.1.1/Gaev.Blog.Examples.PiiTypes/PiiString.cs){:target="_blank"}.

```c#
public class PiiString
{
    private readonly string _string;

    public PiiString(string underlyingString)
        => _string = underlyingString ?? throw new ArgumentNullException(nameof(underlyingString));

    public override string ToString()
        => _string;
}
```

Let's check out `PiiString` for compliance with requirements.

### PII requirement: encrypt, pseudonymize, or anonymize personal data

The `PiiString` value can be converted depending on the encoding logic we use. Let's introduce `IPiiEncoder` to encode PII into multiple formats.

```c#
public interface IPiiEncoder
{
    string ToSystemString(PiiString piiString);
    PiiString ToPiiString(string str);
}
```

#### `PiiString` as a plain-text

```c#
public class PiiAsPlainText : IPiiEncoder
{
    public string ToSystemString(PiiString piiString)
        => piiString.ToString();

    public PiiString ToPiiString(string str)
        => new PiiString(str);
}
```

#### Pseudonymized/anonymized `PiiString` via `SHA 256` hashing

```c#
public class PiiAsSha256 : IPiiEncoder
{
    public string ToSystemString(PiiString piiString)
    {
        var dataToHash = Encoding.UTF8.GetBytes(piiString.ToString());
        using var sha = SHA256.Create();
        var hashedBuffer = sha.ComputeHash(dataToHash);
        return Convert.ToBase64String(hashedBuffer);
    }

    public PiiString ToPiiString(string str)
        => throw new NotSupportedException();
}
```

#### Encrypted `PiiString` via `AES 128`

To encrypt/decrypt you should provide a key for `PiiAsAes128`. See more [PiiAsAes128](https://github.com/gaevoy/Gaev.Blog.Examples/blob/3.1.1/Gaev.Blog.Examples.PiiTypes/PiiAsAes128.cs){:target="_blank"}.

#### Render `PiiString` via `Newtonsoft.Json`

```c#
public class PiiStringConverter : JsonConverter<PiiString>
{
    private readonly IPiiEncoder _encoder;

    public PiiStringConverter(IPiiEncoder encoder)
        => _encoder = encoder;

    public override PiiString ReadJson(JsonReader reader, Type _, PiiString __, bool ___, JsonSerializer ____)
        => reader.Value is string valueAsString
            ? _encoder.ToPiiString(valueAsString)
            : null;

    public override void WriteJson(JsonWriter writer, PiiString value, JsonSerializer _)
        => writer.WriteValue(_encoder.ToSystemString(value));
}
```

See examples of [how to use](https://github.com/gaevoy/Gaev.Blog.Examples/blob/3.1.1/Gaev.Blog.Examples.PiiTypes/NewtonsoftJson/PiiStringTests.cs){:target="_blank"} it.

#### Render `PiiString` via `System.Text.Json`

```c#
public class PiiStringConverter : JsonConverter<PiiString>
{
    private readonly IPiiEncoder _encoder;

    public PiiStringConverter(IPiiEncoder encoder)
        => _encoder = encoder;

    public override PiiString Read(ref Utf8JsonReader reader, Type _, JsonSerializerOptions __)
        => _encoder.ToPiiString(reader.GetString());

    public override void Write(Utf8JsonWriter writer, PiiString value, JsonSerializerOptions _)
        => writer.WriteStringValue(_encoder.ToSystemString(value));
}
```

See examples of [how to use](https://github.com/gaevoy/Gaev.Blog.Examples/blob/3.1.1/Gaev.Blog.Examples.PiiTypes/SystemTextJson/PiiStringTests.cs){:target="_blank"} it.

#### Enable `PiiString` for `Entity Framework Core`

```c#
public class PiiStringConverter : ValueConverter<PiiString, string>
{
    public PiiStringConverter(IPiiEncoder encoder) : base(
        v => encoder.ToSystemString(v),
        v => encoder.ToPiiString(v))
    {
    }
}
```

See examples of [how to use](https://github.com/gaevoy/Gaev.Blog.Examples/blob/3.1.1/Gaev.Blog.Examples.PiiTypes/EfCore/PiiStringTests.cs){:target="_blank"} it.

#### Render `PiiString` by logger frameworks

See `NLog` examples of [how to use](https://github.com/gaevoy/Gaev.Blog.Examples/blob/3.1.1/Gaev.Blog.Examples.PiiTypes/NLog/PiiStringTests.cs){:target="_blank"}.

See `Serilog` examples of [how to use](https://github.com/gaevoy/Gaev.Blog.Examples/blob/3.1.1/Gaev.Blog.Examples.PiiTypes/Serilog/PiiStringTests.cs){:target="_blank"}.

### PII requirement: sign a data processing agreement between your organization and any third parties that process personal data on your behalf.

It usually boils down to find all places in the source code where PII is in use, then processing this information for a lawyer. There is _Find All References_ command in `Visual Studio` which should make things a lot easier.

We could also consider enabling special logic for the `PiiString` fields in tests which would build documentation regarding usage.

## Conclusion

I like how the `PiiString` type makes things explicit and takes control over PII. Much better than the `String`. My implementation is not perfect, for instance, it seems weird to use `PiiString` for date of birth or gender.

An alternative way is using an attribute like `PiiAttribute`, keep in mind, using the attributes implies the reflection or source generators, which may end up in over-complicated implementation.

`SecureString` is not the option because of this: [SecureString shouldn't be used](https://github.com/dotnet/platform-compat/blob/master/docs/DE0001.md){:target="_blank"}.

Anyway, check out [Gaev.Blog.Examples.PiiTypes](https://github.com/gaevoy/Gaev.Blog.Examples/blob/3.1.1/Gaev.Blog.Examples.PiiTypes/){:target="_blank"} for the complete overview. 

Let me know how do you work with PII. Join the discussion in [Reddit](https://www.reddit.com/r/dotnet/comments/thfci2/piistring_net_type_for_personally_identifiable/){:target="_blank"} and [Twitter](https://twitter.com/vgman/status/1504928521474519041){:target="_blank"}.
