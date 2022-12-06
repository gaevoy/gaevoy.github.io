---
published: true
title: Lessons learned from running the company for a year
description: This is a story about software programmer without any experience in business managed to open a company and survived for 1 year in Poland. There are highlights in the article which I hope should help you.
layout: post
tags: [business, GoogleSheets]
comments: true
---

This is a story about a software programmer without any experience in business, who managed to open a company and survived for 1 year in Poland. There are highlights below I have encountered. But before diving into details let's revile how this idea has popped up.

## Background

Almost 5 years ago I decided to move from Ukraine to Poland. As C# developer it was not hard to relocate. There were always offers for relocation. Since then, I'm missing my friends and parents, so I regularly visit my hometown. I had an interesting talk with my friend on one of beer-party. He is part of software development team and wanted to expand to EU. It was summer 2021. Autumn 2021, we opened a company in Poland, it took us 3 month for preparation. [DBB Software](https://dbbsoftware.com/) has born.

![2 beers](/img/lessons-learned-running-company/2-beers.jpg "2 beers" ){:style="max-width:400px; width:100%;" class="block-center"}

Since then, 1 year has pasted, and I would like to share with you my observations. Keep in mind, I'm still new on running business, don't judge too harshly, rather help with suggestions, connections.

## Don't look down, move on learning spiral

In the very beginning it was super frightening how to do, where to start, what to learn, who to ask.

However, it turned out to be easier than expected. There are people whose job to open firms. So you simply need to read and sign documents. Once `DBB Software` is opened, I found accounting office who provided a bookkeeper for us. In entrepreneur group on `Facebook` I found lawyer.

![Learning spiral](/img/lessons-learned-running-company/learning-spiral.jpg "Learning spiral" ){:style="max-width:400px; width:100%;" class="block-center"}

During whole process, I have asked many questions and was learning slowly. New questions popped up, new answers were given. More questions popped up, more answers given. I was moving on the learning spiral. It was slow but steady.

## Know local language

Before moving to Poland, I was under impression that it would be enough to know English to solve cases. It is not. I realized that my English vocabulary is good only in software field :) So to talk to everyone and about any topic it is easy to use Polish language, for them at least. Of course, you can find someone who knows English, but usually you have to stay in a line to wait such. Also, some terminology and abbreviation is hard to translate to English and rather confusing, so better to use original, example:  `ryczałt`, `wyciągi`, `ZUS`, `CIT`, `PIT`, etc.

In most cases, I'm using email to communicate instead of direct communication, meaning I have time to prepare. `Google Translate` and `DeepL Translator` helps a lot. As a result of slow but steady learning, I can talk on the phone with bank staff on Polish, and they understand me now :)

## Know right people

When I write a code for software, I usually don't need to ask people too much. There is the internet, where I can find everything is needed, typically on [StackOverflow](https://stackoverflow.com/). In the extreme, I could go and read source code to figure out why something does not work or how to make it work.

![Right people](/img/lessons-learned-running-company/right-people.jpg "Right people" ){:style="max-width:400px; width:100%;" class="block-center"}

In a business this is completely different. You must know many people and talk to them, like bookkeeper, lawyer, tax officer, bank staff, `DBB Software` CEO and engineers. To participate in `Facebook` entrepreneur groups and watch `YouTube` channels. It gets more complicated when more than one person needs to be involved to solve a problem. Step by step, I managed to build connections with right people.

## Ask correctly, be as specific as possible

When you learn something new it is okay to have many questions, but you can reduce the number. 

In software development, engineers love to over-generalize things. There are even patterns/anti-patterns, like: [Over Generalization Of Business Logic](https://wiki.c2.com/?OverGeneralizationOfBusinessLogic), [Dont Repeat Yourself](http://wiki.c2.com/?DontRepeatYourself). In the beginning, out of habit, I started asking more general questions. Usually, I ended up with the same general answers, which required clarification. And after a few cycles of clarification, the answer became clear.

To avoid wasting time, it is better to break down abstract questions into several more specific ones with a description of the detailed context. Especially, it is important when you ask in email so few cycles of clarification can cost you few days. So instead of the question `How to calculate CIT right?` I would ask `Here is a sample how I think CIT should be calculated can you please correct mistakes?`.

Watch out for yes/no questions, rather ask how and what's needed. So the question `Do I need to get permit type B?` should be like `Why do I need permit type B? Based on what law? What are the deadlines?`.

Abstract questions are still useful as a starting point to scratch the surface where you are new.

## Don't put in one basket

![One basket](/img/lessons-learned-running-company/one-basket.jpg "One basket" ){:style="max-width:400px; width:100%;" class="block-center"}

Human fails a lot more than computers. There is [redundancy](https://en.wikipedia.org/wiki/Redundancy_(engineering)) principle that makes software system reliable. Applying the redundancy to human world meaning you should have at least 2 experts in their field. For instance, 2 lawyers, 2 bookkeepers, etc.

Of course, it won't protect you from human mistakes, however it will increase general reliability and may uncover incompetence. Example: I want to figure out how to calculate CIT, so I would ask 2 independent bookkeepers. It could be that one is sick, so you can count on another one. It could be that both responded, but you found out multiple ways of calculating or even incorrect one.

One more reason of at least 2, you can compare and find the best.

Because of not following redundancy principle from the beginning we have had problem with a bank, where one of SWIFT transfer stuck for more than 2 month due to their terrible support. So benefits having an account in at least 2 banks is obvious now.

## Understand taxes

![Taxes](/img/lessons-learned-running-company/taxes.jpg "Taxes" ){:style="max-width:400px; width:100%;" class="block-center"}

Well, taxes are hard, but you have to understand them at least on basic level. Usually, tax related calculation are done by accounting office, so you don't have to know how to do that exactly. However, to forecast/plan upcoming expenses, it would be nice to know.

There are over-simplified cases and related taxes, to show tax landscape I have discovered:
* `DBB Software` receives transfer from `USA` firm for providing software development service.
  * Affected by taxes: reverse charge VAT.
* `DBB Software` pays for testing software provided by `Ukrainian` firm.
  * Affected by taxes: reverse charge VAT.
* `DBB Software` pays the invoice for the accounting service.
  * Affected by taxes: VAT
* `DBB Software` pays salary to software engineer located in `Poland`.
  * Affected by taxes: PIT, ZUS.
* `DBB Software` reports profit.
  * Affected by taxes: CIT.

As of 2022:
* Reverse charge VAT [0%](https://poradnikprzedsiebiorcy.pl/-reverse-charge-na-fakturach-od-zagranicznego-kontrahenta)
* VAT [5% - 23%](https://www.podatki.gov.pl/vat/abc-vat/matryca-stawek-vat/)
* PIT [12% - 32%](https://www.e-pity.pl/skala-podatkowa/)
* CIT [9% - 19%](https://www.biznes.gov.pl/pl/portal/00251)
* ZUS - there are many flavors of this tax which applies depending on case. I use [online calculator](https://zarobki.pracuj.pl/kalkulator-wynagrodzen) to have a clue.

I'm still not yet there and ask bookkeeper specific questions when needed.

## `Google Sheets` is must-have

![Spreadsheet](/img/lessons-learned-running-company/spreadsheet.jpg "Spreadsheet" ){:style="max-width:400px; width:100%;" class="block-center"}

I never would have thought before, how useful and valuable `Google Sheets` can be. `Google Sheets` is perfect prototyping tool where you can represent almost any processes via spreadsheets and automate via `Google Apps Script`. Currently, we use `Google Sheets` for:
* invoice generation
* accounting of counterparties
* export SWIFT transfers to banks
* CIT tax calculation
* salary taxes calculation

You may say we should use ERP instead, and I would agree, but I could not find a good one which fits our needs for now. Partially, it is because of writting a few lines of `JavaScript` for `Google Sheets` automation is not a problem for me, so it turned out as super flexible option. Anyway, I'm still keep looking for a good ERP.

## `DBB Software` now

![Team](/img/lessons-learned-running-company/team.jpg "Team" ){:style="max-width:400px; width:100%;" class="block-center"}

[DBB Software](https://dbbsoftware.com/) now is a professional services company headquartered in Krakow, Poland. We provide in-house development, DevOps, testing, design, and software architecture. Our team has 70+ IT specialists with the primary tech stack includes `JavaScript`/`TypeScript`, `node.js`, `React Native`, `React.js`, `Vue.js`, `AWS`, and `Go`.

We are partnering with well-known global companies, such as [DispatchHealth](https://www.dispatchhealth.com), [Doctify](https://www.doctify.com), [Bookis](https://bookis.com), [Renovai](https://www.renovai.com), [Uniform](https://uniform.dev), [Plaace](https://plaace.co), and many others. They are happy with our collaboration and share their positive experience in recommendations on our [Clutch](https://clutch.co/profile/dbb-software#reviews) company profile.

[DBB Software](https://dbbsoftware.com/) stands for Driven By Business Software. Every day our developers prove that they are inspired and love their job regardless war, missiles and blackout. I'm proud to be helping them and  100% sure we are ready for new challenges.

![Ready for challenges](/img/lessons-learned-running-company/ready-for-challenges.jpg "Ready for challenges" ){:style="max-width:400px; width:100%;" class="block-center"}

Let me know what do you think, please share your comments, suggestions, remarks:
* in [LinkedIn post](https://www.linkedin.com/posts/vladimirgayevoy_business-learning-software-activity-7005865285572280320-I16o/)
* in [Twitter tweet](https://twitter.com/vgman/status/1600101907581652994)
* or in comments section down below.
