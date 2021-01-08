---
published: true
title: Secure appsettings.json with ease
description: A source code can contain sensitive data such as database connection string, SSL certificate passphrase, 3rd party API key, URL for partner SFTP. Storing them as plain text is a terrible idea. There are a few ways how to keep the secret safe.
layout: post
tags: [csharp, dotnet-core, security]
comments: true
---

Nowadays, it is almost impossible to implement a self-containing application. Even a small web application requires at least a database and email provider. Or maybe even more such as URL to SFTP partner, SSL certificate for server-to-server communication, API keys for integration with 3rd parties. All those data is a secret and should be kept safe. A repository is not a safe place. You most probably heard about data breaches, human error, and misconfiguration. Your local drive is not the safest place because of viruses, malware, worms, trojans, ransomware, spyware, and the rest scary words. What can we do to mitigate the risks?

### CI/CD

The obvious solution - no secrets in a repository, nothing to worry about. Instead, save them in CI/CD system. For instance, [AppVeyor provides secure variables](https://www.appveyor.com/docs/build-configuration/#secure-variables); or [TeamCity typed parameters](https://www.jetbrains.com/help/teamcity/typed-parameters.html).

That's okay, however now the secrets out of your control. So let's hope they won't be breached. 🤞

### Vault

The perfect solution is storing the secrets in a vault, such as `Microsoft Azure Key Vault`, `Google Cloud KMS`, `AWS KMS`, etc. Even better, since there is a [hardware security module](https://en.wikipedia.org/wiki/Hardware_security_module) in action underneath, which theoretically is data breach resilient. 😎

### Built-in AES-256 via `System.Security.Cryptography.Aes`

Hey, why don't we make use of `System.Security.Cryptography.Aes`. It is a built-in `AES-256` cipher, which is [secure enough](https://security.stackexchange.com/a/85778/207381). This way, there is no dependency, and the approach is a bit easier than the rest.

> The Advanced Encryption Standard (AES) is a symmetric block cipher chosen by the U.S. government to protect classified information. AES is implemented in software and hardware throughout the world to encrypt sensitive data. It is essential for government computer security, cybersecurity and electronic data protection — [Margaret Rouse](https://searchsecurity.techtarget.com/definition/Advanced-Encryption-Standard)

Let's imagine an application that uses the following `appsettings.json`. When it starts, it decrypts the ciphertexts in run-time.

```json
{
  "DbConnectionString": "CipherText:09lXf8qen+mQJeAgl7lBcTIdCvpvDOQs7NL3oyiwOJpfqn26PWxkpEkS2+SAGf0BjCHT/uHfXzYZPQeyYyb+0A==",
  "CertificatePassphrase": "CipherText:liYy2ad2f5b4djk8FGpQ3y6+O1+of/ZFgJ1NEtxpRc+drUxKevKjm7RODxgSIvNE",
  "SendGrid": {
    "ApiKey": "CipherText:vZUMf1j23bLV3zY8+OmklWimYgf84TScmXD3lA2eEm2bqhvcjPQyHuiYQ7rqk6oZd3wrpfjASHWnEJ/892asuQ=="
  },
  "Partner": {
    "SftpUrl": "CipherText:6eyuaz4e1TbYP8Y2qQZpVSEuc7TYWR2sLQ2qrJGZDtMGpxJNvH7ietcp/nD/N3w6dEeShc2A9K3SboOY0W1txZ3/xHOzwSuax3bmKnidoQPh+V1OzT7nWnuGX+fQ4hmcE6v5wF6K4DJSbKYkau3ceA=="
  }
}
```

For a complete picture, the ciphertext decryption requires `AES-256` key. We should generate the `AES-256` key and store it aside from the repository. For instance, in a team password manager, Vault, CI/CD system. Afterward, set the key as an environment variable (`CipherKey` in my example) and let the application to read it via `.AddEnvironmentVariables()`. Altogether `Program.cs` looks like:

```c#
class Program
{
    static void Main(string[] args)
    {
        var config = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json")
            .AddEnvironmentVariables()
            .Build()
            .Decrypt(keyPath: "CipherKey", cipherPrefix: "CipherText:");
        Console.WriteLine($@"
DbConnectionString:    {config["DbConnectionString"]}
CertificatePassphrase: {config["CertificatePassphrase"]}
SendGrid.ApiKey:       {config["SendGrid:ApiKey"]}
Partner.SftpUrl:       {config["Partner:SftpUrl"]}
");
    }
}
```

Where `Decrypt` is an extension method for `IConfigurationRoot` which takes: 
* `keyPath` is the name of the environment variable where the `AES-256` key is set; 
* `cipherPrefix` is a value prefix that indicates to a ciphertext that should be decrypted.

```c#
public static IConfigurationRoot Decrypt(this IConfigurationRoot root, string keyPath, string cipherPrefix)
{
    var secret = root[keyPath];
    var cipher = new Aes256Cipher(secret);
    DecryptInChildren(root);
    return root;

    void DecryptInChildren(IConfiguration parent)
    {
        foreach (var child in parent.GetChildren())
        {
            if (child.Value?.StartsWith(cipherPrefix) == true)
            {
                var cipherText = child.Value.Substring(cipherPrefix.Length);
                parent[child.Key] = cipher.Decrypt(cipherText);
            }

            DecryptInChildren(child);
        }
    }
}
```

`Aes256Cipher` is a tiny wrapper around the built-in `AES-256` algorithm. You can check it out in [Gaev.Blog.SecuredAppSettingsJson](https://github.com/gaevoy/Gaev.Blog.Examples/blob/2.9.0/Gaev.Blog.SecuredAppSettingsJson/Aes256Cipher.cs). `Aes256Cipher` prefixes [initialization vector](https://en.wikipedia.org/wiki/Initialization_vector) on top of each ciphertext to hide patterns in encrypted data.

All necessary source code is [here](https://github.com/gaevoy/Gaev.Blog.Examples/tree/2.9.0/Gaev.Blog.SecuredAppSettingsJson). There is [UtilityTests.cs](https://github.com/gaevoy/Gaev.Blog.Examples/blob/2.9.0/Gaev.Blog.SecuredAppSettingsJson/UtilityTests.cs) for better maintenance  where you can:
* [Generate a new unique AES-256 key](https://github.com/gaevoy/Gaev.Blog.Examples/blob/2.9.0/Gaev.Blog.SecuredAppSettingsJson/UtilityTests.cs#L27)
* [Encrypt individual value](https://github.com/gaevoy/Gaev.Blog.Examples/blob/2.9.0/Gaev.Blog.SecuredAppSettingsJson/UtilityTests.cs#L13)
* [Decrypt individual ciphertext](https://github.com/gaevoy/Gaev.Blog.Examples/blob/2.9.0/Gaev.Blog.SecuredAppSettingsJson/UtilityTests.cs#L20)
* [Encrypt whole JSON file at once](https://github.com/gaevoy/Gaev.Blog.Examples/blob/2.9.0/Gaev.Blog.SecuredAppSettingsJson/UtilityTests.cs#L33)
* [Decrypt whole JSON file at once](https://github.com/gaevoy/Gaev.Blog.Examples/blob/2.9.0/Gaev.Blog.SecuredAppSettingsJson/UtilityTests.cs#L59)

Those 3 solutions can be used independently or complement each other. Choose what fits best for you. Please share your way of securing sensitive configuration in the comments.
