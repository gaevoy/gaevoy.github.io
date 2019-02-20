---
published: true
title: 100 LoC console app vs Google Alerts
description: Investigating how and why simple console application that's written in .Net Core can work even better than Google Alerts.
layout: post
tags: [dotnet-core, Serilog, Telegram, cron, Linux, web-crawler]
comments: true
---

It is priceless to be up-to-date and at the same time, it's challenging due to the massive amount of information generated per second. Currently, <ins>you</ins> should look for information via search engines, for instance, `Google Search`. I would like the <ins>information</ins> is finding me!

[Google Alerts](https://www.google.com/alerts) is awesome. The idea to be notified if something has changed for your query is brilliant. The same as [Kafka SQL](https://www.confluent.io/product/ksql/) does it - you write a query, it notifies on every new change.

[Google Alerts](https://www.google.com/alerts) sucks. The method of notification is outdated. The emails, really!? They are so inconvenient comparing to the messenger apps. Huge delay between a real data change and alert itself due to crawler busyness that cannot index the internet more frequently. Not enough search parameters if it comes to a specific area, for instance, housing, renting, cars.

## Problem

Let's imagine, you are looking for a flat to buy in Poland. There is [otodom](https://www.otodom.pl/) site for that matter, so it is not a big deal to search for offers you are interested in. However, found results are static and you have to repeat the search again and again wasting time. I would like that new offers are finding me and not other way around. `Google Alert` will you do that? Of course, if a week delay is not a problem.

(╯°□°）╯︵ ┻━┻

## Solution

Consider what bare minimum implementation will look like. So that can be a starting point to improve in the future if needed.

I will get notifications via [Telegram Messenger](https://telegram.org/) moreover it will store notification history. Luckily, it is supported by popular `.NET` loggers. I checked `NLog`, `log4net`, `Serilog` meaning I don't have to learn yet another API for `Telegram`. If you use another messenger I'm pretty sure it is supported by loggers as well as `Telegram`, for instance, take `Slack` and `Serilog` [Serilog.Sinks.Slack](https://github.com/mgibas/serilog-sinks-slack).

Here how sending a message to `Telegram` via `Serilog` logger looks like.

```c#
var logger = new LoggerConfiguration()
    .WriteTo.Telegram(config.TelegramApiKey, config.TelegramChatId)
    .CreateLogger();
logger.Information("Offer #1 - https://the.internet/offer-1.html");
```

Since `otodom` does not have any API, HTML page will be my API. [HtmlAgilityPack](https://www.nuget.org/packages/HtmlAgilityPack/) will help me to parse it.

```c#
public static class OtoDomCrawler
{
    public static async Task<List<Page>> Search(string url)
    {
        var offers = new List<Page>();
        while (url != null)
        {
            var html = (await new HtmlWeb().LoadFromWebAsync(url)).DocumentNode;
            offers.AddRange(GetOffers(html));
            url = html.SelectSingleNode("//a[@data-dir='next']")?.GetAttributeValue("href", null);
        }
        return offers;
    }
    private static IEnumerable<Page> GetOffers(HtmlNode html)
    {
        foreach (var offer in html.SelectNodes("//*[@class='offer-item-details']"))
        {
            var title = offer.SelectSingleNode(".//*[@class='offer-item-title']");
            var link = title?.AncestorsAndSelf("a").FirstOrDefault();
            yield return new Page
            {
                Link = link?.GetAttributeValue("href", null)?.Split("#")?.FirstOrDefault(),
                Title = title?.InnerText
            };
        }
    }
}
```

In order to store already shown offers, I will use `Sqlite` and `Entity Framework` because it is a low-ceremony way I know.

```c#
public class AlertsDatabase : DbContext
{
    public DbSet<Page> Pages { get; set; }
    protected override void OnConfiguring(DbContextOptionsBuilder opt) =>
        opt.UseSqlite("Data Source=Alerts.sqlite3");
}
public class Page
{
    [Key] public string Link { get; set; }
    public string Title { get; set; }
    public override bool Equals(object compared) => string.Equals(Link, ((Page) compared).Link);
    public override int GetHashCode() => Link.GetHashCode();
}
async Task EntityFramework_and_Sqlite_example()
{
    using (var db = new AlertsDatabase())
    {
        await db.Database.EnsureCreatedAsync();
        db.Pages.Add(new Page
        {
            Link = "https://the.internet/offer-1.html",
            Title = "Offer #1"
        });
        await db.SaveChangesAsync();
    }
}
```

`.NET Core` is chosen to be able to run a console app on `Linux`, so I can run on my `Linux` on the cloud, but it does not really matter, `Windows` will go the same well. The deploy script as simple as below.

```shell
dotnet publish --runtime ubuntu.16.04-x64 --configuration Release
scp -r bin/Release/netcoreapp2.2/ubuntu.16.04-x64/publish/ root@__.___.___.___:/apps/MyAlerts/
ssh root@__.___.___.___
chmod 777 /apps/MyAlerts/Gaev.Blog.Examples.GoogleAlert
```

Because `Linux` is used why not to schedule the app via `cron`, and for `Windows`, you can use built-in `Task Scheduler`. I will use [\*/30 6-23 \* \* \*](https://crontab.guru/#*/30_6-23_*_*_*) cron schedule expression which means `At every 30th minute past every hour from 6 through 23`.

```shell
crontab -e
# configure cron like this
*/30 6-23 * * * /apps/MyAlerts/Gaev.Blog.Examples.GoogleAlert
```

As a result, it took ~100 lines of code. Good start, considering, it works and gives a value!

```c#
public static async Task Main(string[] args)
{
    var config = new ConfigurationBuilder()
        .AddJsonFile("appsettings.json")
        .Build()
        .Get<Config>();
    using (var logger = new LoggerConfiguration()
        .WriteTo.Telegram(config.TelegramApiKey, config.TelegramChatId)
        .CreateLogger())
        try
        {
            using (var db = new AlertsDatabase())
                await Sync(logger, db);
        }
        catch (Exception ex)
        {
            logger.Error(ex, "Oops :(");
        }
}
private static async Task Sync(Logger logger, AlertsDatabase db)
{
    await db.Database.EnsureCreatedAsync();
    var foundPages = await OtoDomCrawler.Search(SpecificOtoDomSearchUrl);
    var knownPages = await db.Pages.ToListAsync();
    var newPages = foundPages.Except(knownPages).ToList();
    db.Pages.AddRange(newPages);
    await db.SaveChangesAsync();
    foreach (var page in newPages)
        logger.Information($"[{page.Title}]({page.Link})");
}
```

Where `SpecificOtoDomSearchUrl` is my super custom filter of flats configuration that I would like to find, e.g. 3 rooms, in Krakow, price range between X to Y.

If you are searching for a flat, car, ticket, job, look how easy to be the first. Information finds you! 

![My alerts delivered by Telegram](/img/telegram-alerts-example.png "My alerts delivered by Telegram" ){:style="width:60%" class="block-center"}

Do you want this but not a technical guy? No problem contact me ([LinkedIn](https://ua.linkedin.com/in/vladimirgayevoy), [Twitter](https://twitter.com/vgman)) and I will help.

Here you can find complete example [Gaev.Blog.Examples.GoogleAlert](https://github.com/gaevoy/Gaev.Blog.Examples/tree/1.5.1/Gaev.Blog.Examples.GoogleAlert).

## Pitfalls

Along the way I came across a few problems and considerations:

* It is a bit tricky how to [setup Telegram bot](https://github.com/oxozle/serilog-sinks-telegram/issues/1).
* If you want to show the alerts to several people (wife, your agency, friends) it is possible to [write to Telegram channels](https://stackoverflow.com/a/42109561/1400547).
* Search result should be small enough. Capabilities of one console app are limited.