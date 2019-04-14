---
published: true
title: End-to-end encrypted chat on JavaScript
description: Refactoring chat implementation to enable end-to-end encryption via kbpgp.js by Keybase
layout: post
tags: [e2e-encryption, javascript, pgp, security, keybase]
comments: true
---

As a starting point for adding end-to-end encryption, I'm going to choose [minimalist chat](/2019/04/07/minimalist-chat.html) written on bare .NET Core and JavaScript without any third party dependency. Let's move from theory to implementation, but before that, I would like to give a bit of introduction in end-to-end encryption. What is it? What for? How?

> Encryption is the process of encoding a message or information in such a way that only authorized parties can access it and those who are not authorized cannot — [Wikipedia](https://en.wikipedia.org/wiki/Encryption)

> End-to-end encryption is a system of communication where only the communicating users can read the messages — [Wikipedia](https://en.wikipedia.org/wiki/End-to-end_encryption)

Basically, a member of the chat encrypts a message before sending out, other members decrypts received the message. As a result, the chat server cannot see the content of the message. There are few ways on how to implement end-to-end encryption but I will focus on only one.

In order to achieve that I will make use of [RSA](<https://en.wikipedia.org/wiki/RSA_(cryptosystem)>) algorithm. It is hard to explain how the algorithm works, more important is how to use it.

Each chat member gets 2 keys generated at the very start of room conversation. Let's call them `public key` and `private key`. If a member encrypts a message using its `public key` then cipher can be decrypted only using its `private key` [^1]. This way, `public key` is sent out to other members. Eventually, all room members know other's `public keys`, however, `private key` keeps being a secret.

Imagine, Alice, Bob and Charlie are chatting. Alice is sending a message. She encrypts the message using Bob's `public key` and send. Then she encrypts the message using Charlie's `public key` and send one more time. Bob and Charlie receive cipher and decrypt it using own `private key`.

## Refactoring

Due to [the limitation of RSA](https://security.stackexchange.com/a/33445) it cannot encrypt more than ~245 bytes. In order to break the limit, I'm going to use [PGP](https://en.wikipedia.org/wiki/Pretty_Good_Privacy) it works practically the same way as `RSA`. 

The beauty of modern browsers that they can perform cryptographic functions in JavaScript moreover this works pretty fast. I chose [kbpgp.js](https://keybase.io/kbpgp) by [Keybase](https://keybase.io/) to enable PGP in JavaScript.

Server-side remains the same no changes needed. For client-side, first of all, I will wrap up low-level operations of `kbpgp.js` into high-level `PgpKey` class.

```javascript
class PgpKey {
    constructor(key) {
        this._key = key;
        if (this.canDecrypt()) {
            this._ring = new kbpgp.keyring.KeyRing();
            this._ring.add_key_manager(key);
        }
    }

    public() {
        return this._key.armored_pgp_public;
    }

    id() {
        return this._key.get_pgp_short_key_id();
    }

    nickname() {
        return this._key.userids[0].get_username();
    }

    encrypt(text, onDone) {
        kbpgp.box({msg: text, encrypt_for: this._key}, (_, cipher) =>
            onDone(cipher));
    }

    canDecrypt() {
        return this._key.can_decrypt();
    }

    decrypt(cipher, onDone) {
        kbpgp.unbox({keyfetch: this._ring, armored: cipher, progress_hook: null}, (_, literals) =>
            onDone(literals[0].toString()));
    }

    static generate(nickname, onDone) {
        let opt = {userid: nickname, primary: {nbits: 1024}, subkeys: []};
        kbpgp.KeyManager.generate(opt, (_, key) =>
            key.sign({}, () =>
                key.export_pgp_public({}, () =>
                    onDone(new PgpKey(key)))));
    }

    static load(publicKey, onDone) {
        kbpgp.KeyManager.import_from_armored_pgp({armored: publicKey}, (_, key) =>
            onDone(new PgpKey(key)));
    }
}
```

* `let key = PgpKey.generate('John Doe' () => ...)` generates new PGP key using `RSA-1024` algorithm, which is more than enough to secure short lived chat conversation.
* `key.public()` returns public key as a string, for instance to send via wires.
* `let key = PgpKey.load('-----BEGIN PGP PUBLIC KEY...', () => ...)` loads PGP key from public key;
* `key.encrypt('Hi there!', cipher => ...)` encrypts the text and returns cipher.
* `key.decrypt('-----BEGIN PGP MESSAGE...', text => ...)` decrypts the cipher and returns the text. Only PGP key having private key can decrypt.

### 1. PGP key generation

Before starting chat conversation PGP key will be generated for current member and their nickname. Since the nickname is included in generated PGP key anybody will know the key's owner nickname.

![Change #1](/img/cryptochat/change1.png "Change #1" ){:style="max-width:878px; width:100%;" class="block-center"}

### 2. Public key exchange & message reception

Once a new member is connected to a chat room it sends out generated public key. As a result, other participants respond with their public key. Eventually, all room members know other's public keys [^2].

As soon as a new message as cipher is received it must be decrypted by the generated key that of course includes private key.

![Change #2](/img/cryptochat/change2.png "Change #2" ){:style="max-width:878px; width:100%;" class="block-center"}

### 3. Sending a message

At this stage, all public keys of room members are known. Before sending, a new message must be encrypted with the recipient's public key, hence the message will be sent multiple times, one per member. 

![Change #3](/img/cryptochat/change3.png "Change #3" ){:style="max-width:878px; width:100%;" class="block-center"}

## Result

Finally, [app.gaevoy.com/cryptochat](https://app.gaevoy.com/cryptochat/) is ready to secure your conversation. `Chrome Developer tools` can show what server-side sees.

![Chat demo](/img/cryptochat/chat-messages.png "Chat demo" ){:style="max-width:1027px; width:100%;" class="block-center"}

Take a look [all changes in PR](https://github.com/gaevoy/Gaev.Chat/pull/5/files) or [source code](https://github.com/gaevoy/Gaev.Chat/tree/2.0.0/Gaev.Chat) I made for [CryptoChat](https://app.gaevoy.com/cryptochat/). Let me know what do you think.

---

[^1]: And vice versa, if a member encrypts a message using its `private key` then cipher can be decrypted only using its `public key`, however this is used mostly for digital signature where `private key` encrypts hash of the message and then `public key` decrypts the hash in order to verify the signature.

[^2]: I implemented the public key exchange in such a way to be as simple as possible but in real life, it is dangerous to trust a key automatically without ownership check. For instance, in order to check ownership, consider [Keybase](https://keybase.io/).