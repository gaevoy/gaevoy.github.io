---
published: false
title: Sign-in via Keybase PGP key
description: Exploring how easy it is to sign-in with the help of PGP key hosted by Keybase.
layout: post
tags: [pgp, signature, keybase, security]
comments: true
---

Wandering through the Internet I have found an interesting question about [Single Sign-On via Keybase](https://github.com/keybase/keybase-issues/issues/1767). The idea behind this started to hold me tight so I decided to experiment to see how hard or easy it can be done. For the sake of simplicity, I have to skip `OAuth` ceremony so it would be just the sign-in form via `Keybase`.

## Theory

Any `Keybase` user has its `PGP` private and public key. Only the user has access to the private one, however, everyone can discover and download its corresponding public key with the help of `Keybase` API. In order to login to our imaginary site, the user must prove that the private key is present. It is possible via digital signature since the operation requires the private key but no need to reveal the key itself. After that corresponding public key can verify the signature to prove the presence of the private one.

#### Sign-in workflow:
1. The user opens a site. The site gives a random text, so-called a challenge.
2. The user must sign the challenge. It can be done via `Keybase` console or [keybase.io](https://keybase.io/).
3. The user sends the signed challenge to the site back.
4. The signature is checked by the site against the corresponding public key. If the signature is confirmed the user is authorized.

## Implementation

#### 1. A challenge generation

I will generate the challenge right in a browser using `JavaScript` like [this](https://stackoverflow.com/a/2117523).

```javascript
let challenge = uuidv4();
```

#### 2. Signing the challenge

`Keybase` console is a perfect candidate to sign the challenge. 

```bash
keybase pgp sign -d -m e108e97bafa94cd8b9937f15611e8bea
```

However, the console won't work for mobile users. In this case, `Keybase` [web page](https://keybase.io/sign) will be an alternative solution to sign. Yep, too many clicks :( Probably, `Keybase` chat bot capabilities can help here, but this is another story.

#### 3. Sending the signature

`PowerShell` can send a request for `Windows` users:

```bash
keybase pgp sign -d -m e108e97bafa94cd8b9937f15611e8bea | powershell -command "Invoke-WebRequest -Uri https://app.gaevoy.com/keybase-sign-in/session/e108e97bafa94cd8b9937f15611e8bea -Method PUT -Headers @{'Content-Type' = 'application/json'} -Body $(@($Input) -join \"`n\")"
```

`curl` can do the same for `Linux` users:

```bash
keybase pgp sign -d -m e108e97bafa94cd8b9937f15611e8bea | curl -k -X PUT --header "Content-Type: application/json" --data-binary @- https://app.gaevoy.com/keybase-sign-in/session/e108e97bafa94cd8b9937f15611e8bea
```

#### 4. Signature verification

Eventually, the server receives something like this:

```
-----BEGIN PGP SIGNATURE-----

wsBcBAABCAAQBQJdCVRgCRDz5IrhFeA+cQAAwT4IAFBpiRqdD1tfSlBaQ9pfzMWv
I2ikKt4GrLiHSQNInahwLEPBX2eohsuU/VydHjgbMO0BI4rI1yIGL8FgKldoaZxZ
oUso0BWxiN3nB9Xkole8Bw8ClSz2jL/f6L4OlGMuIhhZVI0sQS8wbxoe9QO21ctb
wmLdw53DagFzCnDDas7BGgK6dQs49rMjf3QttLFoTr6g8UpaNkbNv6kJpJvKqVXL
OXLnKbmDAR7YGt5LKRyEYpTvtgk+1e+RMUhye3an3m7cO5dzAyKWrDTR/bXnywHU
OAMomrNcZ8T9rv9v0Dxv5tMxoqWBG5mCi6wB1lS/YlQpeDk67a9N/8XXzy1qjUw=
=tnaV
-----END PGP SIGNATURE-----
```

In order to verify the signature, the corresponding public key is required. The signature contains a reference to the key that has been used, see the previous article to figure out [what is inside PGP signature](/2019/05/10/pgp-signature.html). `.NET` library [BouncyCastle](https://www.nuget.org/packages/BouncyCastle) is really good at crypto operations. 

The first step is parsing received signature:

```c#
static PgpSignature ParsePgpSignature(string pgpSignature)
{
    var input = PgpUtilities.GetDecoderStream(new MemoryStream(Encoding.UTF8.GetBytes(pgpSignature)));
    var objectFactory = new PgpObjectFactory(input);
    var signatureList = (PgpSignatureList) objectFactory.NextPgpObject();
    return signatureList[0];
}
```

Then, getting the key ID:

```c#
PgpSignature signature = ParsePgpSignature(body);
long keyId = signature.KeyId;
```

Downloading `PGP` public key from `Keybase` via [key/fetch](https://keybase.io/docs/api/1.0/call/key/fetch) API call. It also gives user name which is super useful for authorization procedure. Moreover, using [user/lookup](https://keybase.io/docs/api/1.0/call/user/lookup) far more user data can be retrieved, such as full name, profile image, social network links:

```c#
using (var cli = new HttpClient())
{
    var url = $"https://keybase.io/_/api/1.0/key/fetch.json?pgp_key_ids={keyId:x8}";
    var json = await cli.GetStringAsync(url);
    var response = JsonConvert.DeserializeObject<dynamic>(json);
    string publicKey = response.keys[0].bundle;
    ...
}
```

Parsing `PGP` public key:

```c#
static PgpPublicKey ParsePgpPublicKey(string publicKey, long keyId)
{
    var input = PgpUtilities.GetDecoderStream(new MemoryStream(Encoding.UTF8.GetBytes(publicKey)));
    var pgpRings = new PgpPublicKeyRingBundle(input);
    return pgpRings.GetPublicKey(keyId);
}
```

Verifying that signature has signed by right `PGP` private key:

```c#
private static bool VerifySignature(PgpPublicKey publicKey, string challenge, PgpSignature signature)
{
    signature.InitVerify(publicKey);
    signature.Update(Encoding.UTF8.GetBytes(challenge));
    return signature.Verify();
}
```

If verification succeeded authorization cookie will be set:

```c#
var identity = new GenericIdentity(userName, CookieAuthenticationDefaults.AuthenticationScheme);
await HttpContext.SignInAsync(new ClaimsPrincipal(identity));
```

I deployed this experiment to [app.gaevoy.com/keybase-sign-in](https://app.gaevoy.com/keybase-sign-in/) in order, you can play with. Source code is available in here [Gaev.Blog.Examples.KeybaseSignIn](https://github.com/gaevoy/Gaev.Blog.Examples/tree/2.0.0/Gaev.Blog.Examples.KeybaseSignIn).

