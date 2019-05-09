---
published: false
title: What is inside PGP signature?
description: Let's analyze PGP signature and see what is hidden inside those strange chars.
layout: post
tags: [pgp, signature, keybase]
comments: true
---

Before a deep dive into PGP signature I will give you a promise so you can trust all my word after that :)

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

Here, I signed my promise digitally via PGP almost the same way as I do traditional handwritten signature. In order to sign my text I used [Keybase](https://keybase.io/sign) that can produce PGP signature. 

> A digital signature is a mathematical scheme for verifying the authenticity of digital messages or documents. A valid digital signature, where the prerequisites are satisfied, gives a recipient very strong reason to believe that the message was created by a known sender, and that the message was not altered in transit — [Wikipedia](https://en.wikipedia.org/wiki/Digital_signature)

> Pretty Good Privacy (PGP) is an encryption program that provides cryptographic privacy and authentication for data communication. PGP is used for signing, encrypting, and decrypting texts, e-mails, files, directories, and whole disk partitions and to increase the security of e-mail communications — [Wikipedia](https://en.wikipedia.org/wiki/Pretty_Good_Privacy)

I do not understand a couple of things. What data is encoded inside those strange chars? Is it possible to reduce the size of the signature? Can the signature be represented as a URL? Let's figure out.

...

https://cirw.in/gpg-decoder/

https://security.stackexchange.com/questions/43329/the-hash-header-in-gpg-ascii-armor

https://security.stackexchange.com/questions/142743/what-is-the-bit-at-the-end-of-a-pgp-signature-file

https://security.stackexchange.com/questions/147976/why-does-gpg-insert-dashes-into-signed-messages

https://espenandersen.no/sign-a-web-page-with-pgp/

https://gchq.github.io/CyberChef/#recipe=Find_/_Replace(%7B'option':'Regex','string':'Version:(%5B%5C%5Cs%5C%5CS%5D%2B)%5B%5C%5Cn%5D%5B%5C%5Cn%5D'%7D,'',true,false,false,false)PEM_to_Hex()From_Hex('Auto')To_Base64('A-Za-z0-9-_')From_Base64('A-Za-z0-9-_',true/disabled)To_Hex('Space'/disabled)Hex_to_PEM('PGP%20SIGNATURE'/disabled)&input=LS0tLS1CRUdJTiBQR1AgU0lHTkFUVVJFLS0tLS0KLS0tLS1FTkQgUEdQIFNJR05BVFVSRS0tLS0t

https://keybase.io/_/api/1.0/key/fetch.json?ops=4&pgp_key_ids=f3e48ae115e03e71

https://keybase.io/_/api/1.0/user/lookup.json?usernames=gaevoy
