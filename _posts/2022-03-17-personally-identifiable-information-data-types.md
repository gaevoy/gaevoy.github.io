---
published: false
title: Data types for personally identifiable information (PII)
description: 
layout: post
tags: [security, pii, gdpr]
comments: true
---

At some point, I started to feel discomfort working with personally identifiable information data in our project. Mostly, because it is relatively new field and not always straightforward. In this article I'm going to try to tackle main issues and make the implicit explicit.

> Personally identifiable information (PII) is any information relating to an identified or identifiable natural person; an identifiable natural person is one who can be identified, directly or indirectly, in particular by reference to an identifier such as a name, an identification number, location data, an online identifier or to one or more factors specific to the physical, physiological, genetic, mental, economic, cultural or social identity of that natural person — [EU GDPR](https://www.privacy-regulation.eu/en/article-4-definitions-GDPR.htm).

Long story short, PII is user personal data, such as name, email, date of birth, social number, etc. According to [the law in many countries](https://en.wikipedia.org/wiki/Personal_data#Laws_and_standards) you must treat PII data in a special way. For example, there is [GDPR regulation](https://en.wikipedia.org/wiki/General_Data_Protection_Regulation) in the European Union. There are a number of restrictions on the use of personal data. I'm going to list some requirements based on [GDPR checklist](https://gdpr.eu/checklist/):

1. Encrypt, pseudonymize, or anonymize personal data wherever possible.
2. Sign a data processing agreement between your organization and any third parties that process personal data on your behalf.
3. It's easy for your customers to request to have their personal data deleted.
4. It's easy for your customers to receive a copy of their personal data in a format that can be easily transferred to another company.

What does this mean for us software engineers? How should this be reflected in the source code?

To meet 1st requirement, PII data should be rendered differently depending on a use case. For example, PII is: 
* plain-text in user interface;
* pseudonymized in logs;
* encrypted in CSV export file.

To meet 2nd requirement, you should be ready for many questions by company lawyer to find out where and why PII is in use.

To meet 3 and 4 requirements, a software engineer should be able to find out what data exactly to delete and export then implement.
