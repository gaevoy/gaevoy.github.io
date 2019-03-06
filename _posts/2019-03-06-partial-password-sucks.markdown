---
published: true
title: Partial password usability sucks
description: Why partial password usability sucks especially while using a password manager and how to improve user your experience
layout: post
tags: [security, password, partial-password, KeePass]
comments: true
---

Nowadays, in order to use a service, you must provide a login and password. In Poland, I got acquainted with a partial password instead of a regular password. 

> A partial password is a mode of password authentication. By asking the user to enter only a few specific characters from their password, rather than the whole password — [Wikipedia](https://en.wikipedia.org/wiki/Partial_password)

Popular banks in Poland require you to provide partial password like in this example.

![Partial password example](/img/partial-password-example.png "Partial password example" ){:style="max-width:598px; width:100%;" class="block-center"}

The idea is good it gives you an extra layer of protection against password theft ([link 1](https://security.stackexchange.com/questions/194814/are-partial-passwords-a-security-improvement-over-full-passwords), [link 2](https://security.stackexchange.com/questions/7467/how-secure-is-asking-for-specific-characters-of-passwords-instead-of-the-entire), [link 3](https://security.stackexchange.com/questions/196427/what-are-the-disadvantages-of-using-shamirs-secret-sharing-to-implement-a-parti?rq=1)). But from user perspective implementation of partial password sucks. It implies that everyone must know their password and even can recall a specific symbol. I cannot for sure. What do I suppose to do if my memory fails? It looks like a password manager is right answer. Unfortunately, my password manager [KeePass does not support partial password](https://sourceforge.net/p/keepass/feature-requests/2219/).

> The Only Secure Password Is the One You Can’t Remember — [Troy Hunt](https://www.troyhunt.com/only-secure-password-is-one-you-cant/)

Given the fact that my password is secure and I cannot remember it, how should I get those 3rd, 9th, 11th symbol?

At the very beginning of my "user experience", I was copy-pasting the password into notepad and finding requested symbol with the help of keyboard cursor and one, two, three counts :) It is boring and not secure at all, since the password is revealed so anyone with good memory is able to see my screen and steal the password.

Then I came up to the idea to build a utility — [partial-password.github.io](https://partial-password.github.io/). Here is the demo of how it works.

<iframe width="560" height="315" style="margin: 0 auto; display: block;" src="https://www.youtube.com/embed/hTZBDptYBdM" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

### How to use [partial-password.github.io](https://partial-password.github.io/)
* If you don't trust [partial-password.github.io](https://partial-password.github.io/) consider to save the page locally and run it from there, for instance `file:///c:/Partial%20password%20calculator%20online.html`
* Open [partial-password.github.io](https://partial-password.github.io/) & copy-paste your password there.
* Click on the requested position of password symbol (or use `Tab` key). Once the symbol is focused it is already in the clipboard. 
* Paste the symbol from clipboard to the site you are about to log in.
* Repeat again for the next requested position.

**Note:** For security reason, after 60 seconds your password will be cleared automatically from [partial-password.github.io](https://partial-password.github.io/) so it is safe to leave the utility open for a long time.

**Hint:** In order to find the utility just google *[partial password calculator](https://www.google.com/search?q=partial+password+calculator)*.

The utility is open-sourced here [github.com/partial-password/partial-password.github.io](https://github.com/partial-password/partial-password.github.io). I tested in Chrome 72 (Windows, Android), Firefox 65 (Windows, Android), Internet Explorer 11, Edge 44. You are welcome to contribute, review, fix bugs. Report me bugs [here](https://github.com/partial-password/partial-password.github.io/issues).

Come and join [interesting discussions on Hacker News](https://news.ycombinator.com/item?id=19321619) about the topic.