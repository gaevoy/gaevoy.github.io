---
published: false
title: Sign-in via Keybase PGP key
description: Exploring how easy it is to sign-in with the help of PGP key hosted by Keybase.
layout: post
tags: [pgp, signature, keybase, security]
comments: true
---

Wandering through the Internet I have found interesting question about [Single Sign On via Keybase](https://github.com/keybase/keybase-issues/issues/1767). The idea behind this started to hold me tight so I decided to experiment to see how hard or easy it can be done. For the sake of simplicity I will skip `OAuth` ceremony so it would be just sign-in via `Keybase` feature.

## Theory

Any `Keybase` user has its `PGP` private and public key. Only the user has access to private one, however everyone can discover and download its corresponding public key with the help of `Keybase` API. In order to login to our imaginary site, the user must prove that the private key is present. It is possible without reviling the key itself via digital signature since the operation requires the private key. After that corresponding public key can verify the signature to prove presence of private one.

#### Sign-in workflow is the following:
1. The user opens a site. The site gives a random text, so called a challenge.
2. The user must sign the challenge and. It can be done via `Keybase` console or [keybase.io](https://keybase.io/).
3. The user sends generated signature to the site back.
4. The signature is checked by the site against corresponding public key. If the signature is confirmed the user is authorized.

## Implementation

#### 1. Challenge generation

I will generate a challenge right in a browser using JavaScript like [this](https://stackoverflow.com/a/2117523).

#### 2. Challenge signature

`Keybase` console is perfect candidate to sign. 

```bash
keybase pgp sign -d -m e108e97bafa94cd8b9937f15611e8bea
```

However, console wont work for mobile users. In this case, `Keybase` [web page](https://keybase.io/sign) will be as alternative solution to sign. Yep, too many clicks :( Probably, `Keybase` chat bot capabilities can help here, but this is another topic.

#### 3. Sending signature

`powershell` can send a request for `Windows` users:

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

In order to verify the signature, corresponding public key is required. The signature contains reference to the key that has been used, see previous article to figure out [what is inside PGP signature](/2019/05/10/pgp-signature.html). `.NET` library [BouncyCastle](https://www.nuget.org/packages/BouncyCastle) is really good at crypto operations.
