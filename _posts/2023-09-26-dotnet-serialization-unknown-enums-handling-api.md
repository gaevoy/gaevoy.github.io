---
published: true
title: Handling of unknown enums in .NET serialization for API integration
description: Explore solutions to handle unknown enum values in .NET during JSON and XML serialization with Newtonsoft.Json, System.Text.Json, and System.Xml. Learn how to maintain seamless API integration, even when new enum values like currencies are introduced, ensuring your application's robustness and adaptability.
layout: post
tags: [dotnet, dotnet-core, csharp, enum, api, json, xml]
comments: true
---

Enumerations, or `Enums`, serve as a [comprehensive method for representing named values](https://en.wikipedia.org/wiki/Enumerated_type){:target="_blank"}, such as currencies (e.g., EUR, USD, NOK) and languages (e.g., English, German, Spanish). They are integral to the vast majority of programming languages. Additionally, [OpenAPI (Swagger) accommodates Enums](https://swagger.io/docs/specification/data-models/enums/){:target="_blank"} through its utilization of JSON, a subset of JavaScript. However, given that JavaScript was [developed in a mere 10 days](https://en.wikipedia.org/wiki/Brendan_Eich){:target="_blank"}, the implementation of enums was not incorporated :) Thus, in JSON and JavaScript, an enum is represented as either a `string` or a `numeric` type.

Typically, enums remain constant and undergo minimal changes over time. After all, the introduction of a new currency or language is a rare occurrence. However, when such changes do occur, they can result in substantial issues.

Have you ever encountered the errors displayed below? If so, let’s navigate through a solution.

```
Newtonsoft.Json.JsonSerializationException : Error converting value "Bitcoin" to type 'Gaev.Blog.EnumAsStringTrap.Currency'. Path '[2].Currency', line 4, position 26.
  ----> System.ArgumentException : Requested value 'Bitcoin' was not found.
   at Newtonsoft.Json.Converters.StringEnumConverter.ReadJson(JsonReader reader, Type objectType, Object existingValue, JsonSerializer serializer)
   at Newtonsoft.Json.Serialization.JsonSerializerInternalReader.DeserializeConvertable(JsonConverter converter, JsonReader reader, Type objectType, Object existingValue)
```
```
System.Text.Json.JsonException : The JSON value could not be converted to Gaev.Blog.EnumAsStringTrap.Money. Path: $[2].Currency | LineNumber: 3 | BytePositionInLine: 26.
   at System.Text.Json.ThrowHelper.ThrowJsonException(String message)
   at System.Text.Json.Serialization.Converters.EnumConverter`1.ReadEnumUsingNamingPolicy(String enumString)
```
```
System.InvalidOperationException : There is an error in XML document (4, 41).
  ----> System.InvalidOperationException : Instance validation error: 'Bitcoin' is not a valid value for Currency.
   at System.Xml.Serialization.XmlSerializer.Deserialize(XmlReader xmlReader, String encodingStyle, XmlDeserializationEvents events)
   at System.Xml.Serialization.XmlSerializer.Deserialize(Stream stream)
```

## Problem

Consider a scenario where our application integrates with a bank’s API to retrieve transaction details. When the application executes `GET api/transactions`, the API returns the following response:

```json
[
   {"Currency": "EUR", "Amount": 1},
   {"Currency": "USD", "Amount": 2}
]
```

For the purpose of deserializing the provided JSON and executing business logic, we have the subsequent models:

```csharp
public record Money(Currency Currency, decimal Amount);

public enum Currency
{
    Undefined = 0,
    EUR = 1,
    USD = 2
}
```

Additionally, we have a deserialization method via `Newtonsoft.Json`:

```csharp
Money[] Deserialize(string json)
{
    return JsonConvert.DeserializeObject<Money[]>(json, new JsonSerializerSettings
    {
        Converters = new List<JsonConverter> { new StringEnumConverter() }
    });
}
```

All operates smoothly until the bank incorporates support for a new currency, namely `Bitcoin`.

```json
[
   {"Currency": "EUR", "Amount": 1},
   {"Currency": "USD", "Amount": 2},
   {"Currency": "Bitcoin", "Amount": 3}
]
```

Subsequently, deserializing the entire list becomes unfeasible, resulting in the aforementioned exceptions. This disrupts the bank integration process.

## Solution

To circumvent such disruptions in the future, several strategies can be employed:
* Adapt string enums as a `string` type in the .NET model.
* Customize .NET JSON/XML serializer to accommodate unknown string enums.

While it would be advantageous to deserialize an enum even when the corresponding value is undefined, libraries such as `Newtonsoft.Json`, `System.Text.Json`, and `System.Xml.Serialization` lack inherent support for this feature. Nevertheless, extensions can readily be implemented.

### `Newtonsoft.Json`

To facilitate unknown enums, the `StringEnumConverter` can be extended to return the default enum value when a specific error is encountered.

```csharp
public class UnknownEnumConverter : StringEnumConverter
{
    public override object ReadJson(JsonReader reader, Type enumType, object existingValue, JsonSerializer serializer)
    {
        try
        {
            return base.ReadJson(reader, enumType, existingValue, serializer);
        }
        catch (JsonSerializationException) when (enumType.IsEnum)
        {
            return Activator.CreateInstance(enumType);
        }
    }
}
```

Here, `Activator.CreateInstance(enumType)` yields the default value, which for the `Currency` enum, is `Undefined`.

```csharp
[Test]
public void It_should_deserialize_unknown_enum_value()
{
    // Given
    var json = """
               [
                   {"Currency": "EUR", "Amount": 1},
                   {"Currency": "USD", "Amount": 2},
                   {"Currency": "Bitcoin", "Amount": 3}
               ]
               """;

    // When
    var actual = JsonConvert.DeserializeObject<Money[]>(json, new JsonSerializerSettings
    {
        Converters = new List<JsonConverter> { new UnknownEnumConverter() }
    });

    //Then
    actual.Should().BeEquivalentTo(new[]
    {
        new Money(Currency.EUR, 1),
        new Money(Currency.USD, 2),
        new Money(default, 3),
    });
}
```

### `System.Text.Json`

To support unknown enums in `System.Text.Json` we should extend built-in `JsonStringEnumConverter` but the approach is the same as above.

```csharp
public class UnknownEnumConverter : JsonConverterFactory
{
    private readonly JsonStringEnumConverter _underlying = new();

    public sealed override bool CanConvert(Type enumType)
        => _underlying.CanConvert(enumType);

    public sealed override JsonConverter CreateConverter(Type enumType, JsonSerializerOptions options)
    {
        var underlyingConverter = _underlying.CreateConverter(enumType, options);
        var converterType = typeof(UnknownEnumConverter<>).MakeGenericType(enumType);
        return (JsonConverter)Activator.CreateInstance(converterType, underlyingConverter);
    }
}
public class UnknownEnumConverter<T> : JsonConverter<T> where T : struct, Enum
{
    private readonly JsonConverter<T> _underlying;

    public UnknownEnumConverter(JsonConverter<T> underlying)
        => _underlying = underlying;

    public override T Read(ref Utf8JsonReader reader, Type enumType, JsonSerializerOptions options)
    {
        try
        {
            return _underlying.Read(ref reader, enumType, options);
        }
        catch (JsonException) when (enumType.IsEnum)
        {
            return default;
        }
    }

    public override bool CanConvert(Type typeToConvert)
        => _underlying.CanConvert(typeToConvert);

    public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options)
        => _underlying.Write(writer, value, options);

    public override T ReadAsPropertyName(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => _underlying.ReadAsPropertyName(ref reader, typeToConvert, options);

    public override void WriteAsPropertyName(Utf8JsonWriter writer, T value, JsonSerializerOptions options)
        => _underlying.WriteAsPropertyName(writer, value, options);
}

```

Upon encountering an unknown value, the `default` keyword yields the default enum value, i.e., `Undefined` for `Currency`.

```csharp
[Test]
public void It_should_deserialize_unknown_enum_value()
{
    // Given
    var json = """
               [
                   {"Currency": "EUR", "Amount": 1},
                   {"Currency": "USD", "Amount": 2},
                   {"Currency": "Bitcoin", "Amount": 3}
               ]
               """;

    // When
    var actual = JsonSerializer.Deserialize<Money[]>(json, new JsonSerializerOptions
    {
        Converters = { new UnknownEnumConverter() }
    });

    //Then
    actual.Should().BeEquivalentTo(new[]
    {
        new Money(Currency.EUR, 1),
        new Money(Currency.USD, 2),
        new Money(default, 3),
    });
}
```

### `System.Xml`

This one is a bit tricky, but still manageable. The `XmlSerializer` does not feature any serialization converters like typical JSON libraries do, but achieving our goal is still possible. However, this necessitates modifications to the C# model. Let's examine how our model appeared previously.

```csharp
public class Money
{
    public Money()
    {
    }

    public Currency Currency { get; set; }
    public decimal Amount { get; set; }
}
```

Let's see how it will be structured to handle unknown enums.

```csharp
public class Money
{
    public Money()
    {
    }

    [XmlIgnore] 
    public Currency CurrencyAsEnum { get; set; }

    public string Currency
    {
        get => CurrencyAsEnum.ToString("G");
        set => CurrencyAsEnum = Enum.TryParse<Currency>(value, out var result)
            ? result
            : default;
    }

    public decimal Amount { get; set; }
}
```

Essentially, the `Currency` property has been changed to a string, and a `CurrencyAsEnum` property has been introduced to hold a currency value as an enum. This adjustment facilitates the deserialization process.

```csharp
[Test]
public void It_should_deserialize_unknown_enum_value()
{
    // Given
    var xml = """
              <ArrayOfMoney>
                  <Money><Currency>EUR</Currency><Amount>1</Amount></Money>
                  <Money><Currency>USD</Currency><Amount>2</Amount></Money>
                  <Money><Currency>Bitcoin</Currency><Amount>3</Amount></Money>
              </ArrayOfMoney>
              """;

    // When
    var serializer = new XmlSerializer(typeof(Money[]));
    var xmlAsStream = new MemoryStream(Encoding.UTF8.GetBytes(xml));
    var actual = serializer.Deserialize(xmlAsStream);

    // Then
    actual.Should().BeEquivalentTo(new[]
    {
        new Money { CurrencyAsEnum = Currency.EUR, Amount = 1 },
        new Money { CurrencyAsEnum = Currency.USD, Amount = 2 },
        new Money { CurrencyAsEnum = Currency.Undefined, Amount = 3 }
    });
}
```

With these adaptations, the application will sustain its functionality even upon the introduction of new currencies by the bank. Transactions involving unfamiliar currencies will be represented as `Currency.Undefined` within the application.

Ensuring the recognition of `Currency.Undefined` currency is pivotal to prevent disruptions in the business logic operations.

## Frequently Asked Questions

### Why do unknown enum values cause deserialization issues in .NET?
By default, when .NET libraries encounter an unknown enum value during deserialization, they throw exceptions as this value doesn't match any predefined enum member. This can break the integration with APIs introducing new values.

### How can handling unknown enums benefit API integration?
Handling unknown enums gracefully ensures that the introduction of new enum values in the integrated API does not break the existing functionality of your application. This promotes robustness and adaptability in your system.

### Can the solutions provided be applied to all .NET serialization libraries?
The article provides solutions for `Newtonsoft.Json`, `System.Text.Json`, and `System.Xml`. While these are common libraries, the approach might differ for other libraries, so be sure to check the respective documentation.

### What should I do with the `Undefined` enum value in my business logic?
It is essential to handle `Undefined` or default enum values in your business logic to avoid unexpected behavior. You might log them for analysis, request updates to your enum definitions, or implement fallback logic depending on the use case.

### Where can I find the source code used in this blog post?
All related source code is available [on Gaev.Blog.EnumAsStringTrap](https://github.com/gaevoy/Gaev.Blog.Examples/tree/3.5.0/Gaev.Blog.EnumAsStringTrap){:target="_blank"} for further exploration and implementation.

## In Conclusion

Employing enums is a robust method for representing named values within your application. However, when interacting with external APIs, it’s imperative to anticipate and gracefully handle potential changes in enum values. This article has elucidated how to modify various .NET serializers to accommodate unknown enum values, thereby ensuring the seamless and uninterrupted integration of your application with external APIs.

Hey, thanks a bunch for swinging by and reading the article! Did it spark any thoughts or questions? Maybe you've got your own experiences with .NET serialization and unknown enums? Don’t be a stranger—drop a comment below and let’s get chatting! Your insights could be the golden nuggets someone else is searching for. Cheers to sharing and learning together!
