---
published: false
title: End-to-end encrypted chat on JavaScript
description: Refactoring chat implementation to enable end-to-end encryption via kbpgp.js
layout: post
tags: [e2e-encryption, javascript, pgp, security, keybase]
comments: true
---

As starting point for adding end-to-end encryption I'm going to choose [minimalist chat](/2019/04/07/minimalist-chat.html) written on bare .NET Core and JavaScript without any third party dependency. We are going to move from theory to implementation. But before that I would like to give a bit of introduction in end-to-end encryption. What is it? What for? How?

> Encryption is the process of encoding a message or information in such a way that only authorized parties can access it and those who are not authorized cannot — [Wikipedia](https://en.wikipedia.org/wiki/Encryption)

> End-to-end encryption is a system of communication where only the communicating users can read the messages — [Wikipedia](https://en.wikipedia.org/wiki/End-to-end_encryption)

In theory, a member of the chat encrypts a message before sending out, other members decrypts received message. As a result, the chat server cannot see content of the message.

In order to achieve that I will make use of [RSA](https://en.wikipedia.org/wiki/RSA_(cryptosystem) algorithm. It is hard to explain how the algorithm works, more important is how to use it.

Each chat member gets 2 keys generated at the very start of room conversation. Let's call them `public key` and `private key`. If a member encrypts a message using its `public key` then the encrypted message can be decrypted only using its `private key` [^1]. This way, `public key` is sent out to other members, eventually all room members know other's `public keys`, however `private key` keeps being a secret.

Imagine, Alice, Bob and Charlie are chatting. Alice is sending a message. She encrypts the message using Bob's `public key` and send then encrypts the message using Charlie's `public key` and send one more time. Bob and Charlie receive encrypted message and decrypt using own `private key`.

Due to [limitation of RSA](https://security.stackexchange.com/a/33445) it cannot encrypt more then ~245 bytes. In order to break the limit I'm going to use [PGP](https://en.wikipedia.org/wiki/Pretty_Good_Privacy), keybase .... Not to overload with details let's consider it is as improved [RSA]...


[^1]: And vise versa, if a member encrypts a message using its `private key` then the encrypted message can be decrypted only using its `public key`, however it is used mostly for digital signature where `private key` encrypts hash of the message then `public key` decrypts the hash in order to verify the signature.