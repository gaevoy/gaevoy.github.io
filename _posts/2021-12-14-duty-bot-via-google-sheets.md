---
published: true
title: Duty bot via Google Sheets
description: Who's on duty today? Let's implement a Slack bot with the help of Google Sheets. The bot turned out to be a free, serverless solution.
layout: post
tags: [javascript, serverless, bot, GoogleSheets]
comments: true
---

Who's on duty today? Yeah, it always takes me to school time. However, this keeps sounding over and over again during software development. Because, our team has a support duty to quickly respond to technical questions by the support team, follow logs, and system health. Usually, it is a boring task with a high chance of numerous context switches, so no one is a fan of doing that all the time. A nice trade-off is the support duty.

## Problem

We used to have one of the `Slack` duty bots but I had a hard time changing a schedule. I always used to forget how to do that, because a command line is not the best user-friendly way to make a schedule. It would be nice to edit the schedule in an `Excel`-like table editor. I decided to have a try `Google Sheets`. It has a nice API so I will be able to write the bot in my lovely `C#`.

## Solution

After a few evenings googling how to glue together the C# app and `Google Sheets` I suddenly discovered `Apps Script`. This is like old-fashioned `Excel` macros but in a cloud via `JavaScript`. Wow, that's it!

> Google Apps Script is a cloud-based JavaScript platform that lets you integrate with and automate tasks across Google products — [Google](https://developers.google.com/apps-script).

`Apps Script` for `Google Sheets` is able to call `Slack` webhook to deliver a message about who's on duty today:
* when the schedule changes, 
* every day in the morning.

The duty schedule spreadsheet will consist of:
### 1. `Schedule` sheet

Here are the dates and duty officers for that day.

![Schedule sheet](/img/duty-bot/schedule-sheet.png "Schedule sheet" ){:style="max-width:393px; width:100%;" class="block-center"}

### 2. `Bot` sheet

The bot script will save its state here. This is necessary in order to find out if the duty officer has changed.

![Bot sheet](/img/duty-bot/bot-sheet.png "Bot sheet" ){:style="max-width:393px; width:100%;" class="block-center"}

Importantly! The time zone of the spreadsheet must be changed to `(GMT+00:00) GMT` (`File` menu → `Settings` → `General` tab → `Time zone` field).

![Settings](/img/duty-bot/settings.png "Settings" ){:style="max-width:393px; width:100%;" class="block-center"}

### 3. The script

Basically, here is the bot logic in a few lines of `JavaScript`. Go to `Extensions` menu → `Apps Script` → copy&paste the following.

```js
function check() {
    var spreadsheet = SpreadsheetApp.getActive();
    var schedule = spreadsheet.getSheetByName('Schedule').getDataRange().getValues();
    var onDuty = spreadsheet.getSheetByName('Bot').getRange(2, 1);
    var today = new Date();
    today.setUTCHours(0, 0, 0, 0); 
    for (var item = 1; item < schedule.length; item++) {
        var [date, officer] = schedule[item];
        if (date.getTime() == today.getTime() && officer && officer != onDuty.getValue()) {
            onDuty.setValue(officer);
            console.log(officer + " is on duty");
        }
    }
}
```

The script iterates through the `schedule` searching for a duty `officer` for `today`. When the `officer` is found, it becomes `onDuty` so a notification is sent out (via `console.log` for now).

At the very first time, you should click the `Run` button to see then approve all required permissions for the script.

![Permissions review](/img/duty-bot/permissions-request.png "Permissions review" ){:style="max-width:575px; width:100%;" class="block-center"}

### 4. On-change and time-driven trigger 

In order to check the schedule when it changes and every morning (for instance at 8:00), we need to add the `on-change` and `time-driven` triggers. Go to `Apps Script` left sidebar → `Triggers` page → `Add trigger` button.

![On change trigger](/img/duty-bot/on-change-trigger.png "On change trigger" ){:style="max-width:663px; width:100%;" class="block-center"}

![Time-driven trigger](/img/duty-bot/time-driven-trigger.png "Time-driven trigger" ){:style="max-width:659px; width:100%;" class="block-center"}

## `Slack` integration

To send out the notification via `Slack` when on-duty changes we could use the following code instead of `console.log`.

```js
var slackWebhook = "https://hooks.slack.com/services/...";
UrlFetchApp.fetch(slackWebhook, {
  method: "POST",
  "contentType": "application/json",
  "payload": JSON.stringify({ text: officer + " is on duty" })
});
```

Where `slackWebhook` is [an incoming webhook](https://api.slack.com/messaging/webhooks) that you should get in `Slack`, see [the instruction](https://api.slack.com/messaging/webhooks#create_a_webhook).

![Slack bot](/img/duty-bot/slack-bot.gif "Slack bot" ){:style="max-width:1070px; width:100%;" class="block-center"}

## Recap

So what we get. With the help of `Google Sheets` and a little knowledge of `JavaScript`, we have got a `Slack` bot running in the cloud for free.

Is that legal? Why did I find out about this just now?!
