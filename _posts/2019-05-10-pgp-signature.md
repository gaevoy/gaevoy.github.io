---
published: true
title: What is inside PGP signature?
description: Let's analyze PGP signature and see what is hidden inside those strange chars.
layout: post
tags: [pgp, signature, keybase, security]
comments: true
---

Before a deep dive into PGP signature, I will give you a promise so you can trust all my word afterward :)

```text
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

I Promise that, to the best of my ability and judgement:

1. I will not produce harmful code.
2. The code that I produce will always be my best work. I will 
   not knowingly release code that is defective either in 
   behavior or structure.
3. I will produce, with each release, a quick, sure, and 
   repeatable proof that every element of the code works as it 
   should.
4. I will make frequent, small, releases so that I do not 
   impede the progress of others.
5. I will fearlessly and relentlessly improve the code at every 
   opportunity. I will never make the code worse.
6. I will do all that I can to keep the productivity of myself, 
   and others, as high as possible. I will do nothing that 
   decreases that productivity.
7. I will continuously ensure that others can cover for me, and 
   that I can cover for them.
8. I will produce estimates that are honest both in magnitude 
   and precision. I will not make promises without certainty.
9. I will never stop learning and improving my craft.

Vladimir Gaevoy, 
09-05-2019
-----BEGIN PGP SIGNATURE-----
Version: Keybase OpenPGP v2.1.0
Comment: https://keybase.io/crypto

wsBcBAABCgAGBQJc1H74AAoJEPPkiuEV4D5x7p0H/2HiVzubj0S/omJUi3O5xAiM
kXEjSDy0Q2qRfkRFbp+zI0YuhI9A4qULEGGGvEH7zS3Dp1WuwHfSIrAgoXNcu3zX
/dDrsCd6RkQdltjfinTxneCTgiXv47ho8qBj9w9uM+tYC1+N6kxOS3KGrFAJfQL7
pkrblWvkNmu3v7CtcZagWi2nU96ng9A4g5vMuoxcbCGuhcKVCZv1btLHRvxWHGIS
gy9Tjz68e1/Ep95dgYolvMIwGPhAEqNnXxs/3zu6jkfFASyIcUNAFbUa5i6Rf+2d
Ffl55qDidR3Hd7qOGZpSJ/5m3hGReQsaqBE901NTV7DR7Bn+ICx7f9YZwR9TJQs=
=zjPT
-----END PGP SIGNATURE-----
```

Traditional handwritten signature sucks. It can be easily forged. The signed text can be changed. In order to verify that signature is legitimate, you have to know how it looks like otherwise, it is pretty hard to figure out.

Above, I signed my promise digitally by PGP almost the same way as I do a traditional handwritten signature. In order to sign I used [Keybase](https://keybase.io/sign), it can produce a PGP signature.

> A digital signature is a mathematical scheme for verifying the authenticity of digital messages or documents. A valid digital signature, where the prerequisites are satisfied, gives a recipient very strong reason to believe that the message was created by a known sender, and that the message was not altered in transit — [Wikipedia](https://en.wikipedia.org/wiki/Digital_signature)

> Pretty Good Privacy (PGP) is an encryption program that provides cryptographic privacy and authentication for data communication. PGP is used for signing, encrypting, and decrypting texts, e-mails, files, directories, and whole disk partitions and to increase the security of e-mail communications — [Wikipedia](https://en.wikipedia.org/wiki/Pretty_Good_Privacy)

Despite theory about PGP signature, I do not understand a couple of things. What data is encoded inside those strange chars? Is it possible to reduce the size of the signature? Let's figure out.

## What is inside PGP signature

Thanks to open source, I can decode any PGP message. [cirw.in/gpg-decoder/](https://cirw.in/gpg-decoder/) is perfect tool for me. [And that's what's inside](https://cirw.in/gpg-decoder/#-----BEGIN%20PGP%20SIGNATURE-----%0AVersion:%20Keybase%20OpenPGP%20v2.1.0%0AComment:%20https://keybase.io/crypto%0A%0AwsBcBAABCgAGBQJc1H74AAoJEPPkiuEV4D5x7p0H/2HiVzubj0S/omJUi3O5xAiM%0AkXEjSDy0Q2qRfkRFbp+zI0YuhI9A4qULEGGGvEH7zS3Dp1WuwHfSIrAgoXNcu3zX%0A/dDrsCd6RkQdltjfinTxneCTgiXv47ho8qBj9w9uM+tYC1+N6kxOS3KGrFAJfQL7%0ApkrblWvkNmu3v7CtcZagWi2nU96ng9A4g5vMuoxcbCGuhcKVCZv1btLHRvxWHGIS%0Agy9Tjz68e1/Ep95dgYolvMIwGPhAEqNnXxs/3zu6jkfFASyIcUNAFbUa5i6Rf+2d%0AFfl55qDidR3Hd7qOGZpSJ/5m3hGReQsaqBE901NTV7DR7Bn+ICx7f9YZwR9TJQs=%0A=zjPT%0A-----END%20PGP%20SIGNATURE-----).

![Decode binary via cirw.in](/img/pgp-signature/decoded-binary.png "Decode binary via cirw.in" ){:style="max-width:1027px; width:100%;" class="block-center"}

Obviously, there is a digital signature. But additionally there are:

* `publicKeyAlgorithm` - the name of algorithm that produced the signature, in my case `RSA`.
* `hashAlgorithm` - the name of algorithm that was used to hash text before signature, in my case `SHA512`. Wait a minute, I already have seen it just after `-----BEGIN PGP SIGNED MESSAGE-----`. The answer is ["Hash:" header can be considered as a remnant of older times](https://security.stackexchange.com/a/43333/207381).
* `creationTime` - the date when signature has been created. The field is also signed so it is [trustworthy](https://crypto.stackexchange.com/a/2676) (if you trust the signer).
* `keyId` - ID of the key that signed the text, in my case `f3e48ae115e03e71`. In order to verify the signature, the public key can be downloaded [here](https://keybase.io/_/api/1.0/key/fetch.json?ops=4&pgp_key_ids=f3e48ae115e03e71) via [Keybase API](https://keybase.io/docs/api/1.0/call/key/fetch). Moreover, `Keybase` provides complete information about [the owner of the key](https://keybase.io/_/api/1.0/user/lookup.json?usernames=gaevoy) via [Keybase API](https://keybase.io/docs/api/1.0/call/user/lookup), so anyone can prove that the signer is legitimate, looking to the connected entities. 

![Keybase proofs](/img/pgp-signature/keybase-proofs.png "Keybase proofs" ){:style="max-width:225px; width:100%;" class="block-center"}

## Removing PGP signature redundancy

It is interesting what parts can be removed. I don't expect to be compatible with PGP standard after that. However, the reduced version should be convertible back to the original. One more open source tool will help me to prototype. Greet, [CyberChef](https://gchq.github.io/CyberChef/)!

![Removing redundancy](/img/pgp-signature/redundant-parts.png "Removing redundancy" ){:style="max-width:1107px; width:100%;" class="block-center"}

Here are my [CyberChef recipes](<https://gchq.github.io/CyberChef/#recipe=Find_/_Replace(%7B'option':'Regex','string':'Version:(%5B%5C%5Cs%5C%5CS%5D%2B)%5B%5C%5Cn%5D%5B%5C%5Cn%5D'%7D,'',true,false,false,false)PEM_to_Hex()Hex_to_PEM('PGP%20SIGNATURE')&input=LS0tLS1CRUdJTiBQR1AgU0lHTkFUVVJFLS0tLS0KVmVyc2lvbjogS2V5YmFzZSBPcGVuUEdQIHYyLjEuMApDb21tZW50OiBodHRwczovL2tleWJhc2UuaW8vY3J5cHRvCgp3c0JjQkFBQkNnQUdCUUpjMUg3NEFBb0pFUFBraXVFVjRENXg3cDBILzJIaVZ6dWJqMFMvb21KVWkzTzV4QWlNCmtYRWpTRHkwUTJxUmZrUkZicCt6STBZdWhJOUE0cVVMRUdHR3ZFSDd6UzNEcDFXdXdIZlNJckFnb1hOY3UzelgKL2REcnNDZDZSa1FkbHRqZmluVHhuZUNUZ2lYdjQ3aG84cUJqOXc5dU0rdFlDMStONmt4T1MzS0dyRkFKZlFMNwpwa3JibFd2a05tdTN2N0N0Y1phZ1dpMm5VOTZuZzlBNGc1dk11b3hjYkNHdWhjS1ZDWnYxYnRMSFJ2eFdIR0lTCmd5OVRqejY4ZTEvRXA5NWRnWW9sdk1Jd0dQaEFFcU5uWHhzLzN6dTZqa2ZGQVN5SWNVTkFGYlVhNWk2UmYrMmQKRmZsNTVxRGlkUjNIZDdxT0dacFNKLzVtM2hHUmVRc2FxQkU5MDFOVFY3RFI3Qm4rSUN4N2Y5WVp3UjlUSlFzPQo9empQVAotLS0tLUVORCBQR1AgU0lHTkFUVVJFLS0tLS0>). 2 things are removed which are not required:
 * Header at the beginning.
 * [CRC checksum](https://security.stackexchange.com/questions/142743/what-is-the-bit-at-the-end-of-a-pgp-signature-file) at the end.
 
 Until now it still remains to be valid PGP signature. However, we can remove the rest of noise to get eventually this:
 
 ```text
I Promise that, to the best of my ability and judgement:

1. I will not produce harmful code.
2. The code that I produce will always be my best work. I will 
   not knowingly release code that is defective either in 
   behavior or structure.
3. I will produce, with each release, a quick, sure, and 
   repeatable proof that every element of the code works as it 
   should.
4. I will make frequent, small, releases so that I do not 
   impede the progress of others.
5. I will fearlessly and relentlessly improve the code at every 
   opportunity. I will never make the code worse.
6. I will do all that I can to keep the productivity of myself, 
   and others, as high as possible. I will do nothing that 
   decreases that productivity.
7. I will continuously ensure that others can cover for me, and 
   that I can cover for them.
8. I will produce estimates that are honest both in magnitude 
   and precision. I will not make promises without certainty.
9. I will never stop learning and improving my craft.

Vladimir Gaevoy, 
09-05-2019
https://imaginary.service/signature/wsBcBAABCgAGBQJc1H74AAoJEPPkiuEV4D5x7p0H_2HiVzubj0S_omJUi3O5xAiMkXEjSDy0Q2qRfkRFbp-zI0YuhI9A4qULEGGGvEH7zS3Dp1WuwHfSIrAgoXNcu3zX_dDrsCd6RkQdltjfinTxneCTgiXv47ho8qBj9w9uM-tYC1-N6kxOS3KGrFAJfQL7pkrblWvkNmu3v7CtcZagWi2nU96ng9A4g5vMuoxcbCGuhcKVCZv1btLHRvxWHGISgy9Tjz68e1_Ep95dgYolvMIwGPhAEqNnXxs_3zu6jkfFASyIcUNAFbUa5i6Rf-2dFfl55qDidR3Hd7qOGZpSJ_5m3hGReQsaqBE901NTV7DR7Bn-ICx7f9YZwR9TJQs
```

I can imagine how this representation of PGP signature simplify usability for both none technical users and for technical geeks. They just need to click the link and `imaginary.service` will do the rest dirty work: explain, verify, show details about signer and signature. By the way, QR Code can be a representation of PGP signature too:

![QR Code as PGP signature](/img/pgp-signature/signature.svg "QR Code as PGP signature" ){:style="max-width:400px; width:100%;" class="block-center"}

So cool to realize what is encoded inside this QR code!
