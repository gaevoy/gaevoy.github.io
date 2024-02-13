---
published: true
title: The smallest file server on C# to save data from a dying Linux
description: How I was trying to upgrade Ubuntu so that it all ended up saving data from a dying system
layout: post
tags: [csharp, dotnet, ngrok, linux, curl]
comments: true
---

One evening after a couple of hours of battle in `Age of Empires` when I felt like a winner, I came up to the conclusion that I must upgrade `Ubuntu` on a `DigitalOcean` droplet. I had the droplet with `Ubuntu 16.04` to run [app.gaevoy.com](https://app.gaevoy.com/){:target="_blank"}. It was 23:00 and I thought I could do it quickly so I run `do-release-upgrade` immediately. `Windows Update` spoiled me and I didn't make any backup beforehand. After a while it asked me to merge a configuration conflict I pressed either `Esc` or even `Ctrl + C` by mistake but the upgrade continued. Then the upgrade just stuck without moving. A restart 3 times didn't help. I got a kernel error while booting droplet. Good job :(

![Crash while booting](/img/do-restore/kernel-panic.png "Crash while booting" ){:style="max-width:994px; width:100%;" class="block-center"}

## Problem

It is time to save data from the dying `Ubuntu`. I managed to `ssh` to `DigitalOcean` [recovery droplet](https://www.digitalocean.com/docs/droplets/resources/recovery-iso/){:target="_blank"} via the web console and mount disk with my data. But how can I download data to my computer?

## Solution

The easiest way to [`ssh` to the recovery droplet](https://www.digitalocean.com/docs/droplets/resources/recovery-iso/#migrate-files){:target="_blank"} and download data via `SCP` or `SFTP` but I found this solution later :(

The way I went is running an `HTTP` file server on the `localhost` then expose it to the internet via [ngrok](https://ngrok.com/){:target="_blank"}. Finally, upload files via `curl` from inside the recovery droplet. Here is the sequence diagram on how it looks like. 

![Ubuntu -> ngrok -> localhost -> disk chain diagram](/img/do-restore/route.svg "Ubuntu -> ngrok -> localhost -> disk chain diagram" )

`ngrok` must expose local `HTTP` as `HTTPS`. In this case, a man in the middle between `Ubuntu` and `ngrok` servers cannot see the data I'm sending. However, I don't suggest to send sensitive data this way, consider to encrypt data before sending via e.g. [7z](https://unix.stackexchange.com/a/325783){:target="_blank"}.

The file server is written in `C#` for `.NET Core` and can only receive files.

```c#
public class Program
{
    public static void Main(string[] args) =>
        WebHost.CreateDefaultBuilder(args)
            .UseStartup<Startup>()
            .UseKestrel(opt => { opt.Limits.MaxRequestBodySize = null; })
            .Build()
            .Run();
}

public class Startup
{
    public void Configure(IApplicationBuilder app, IHostingEnvironment env)
    {
        app.Run(async ctx =>
        {
            using (var file = File.OpenWrite(Path.GetFileName(ctx.Request.Path)))
            {
                await ctx.Request.Body.CopyToAsync(file);
                await ctx.Response.WriteAsync($"Received in `{file.Name}`\n");
            }
        });
    }
}
```

To start the file server I run.

```
start dotnet run
start ngrok http 5000
```

Then `ngrok` will display the assigned hostname. In my case, it was `https://f81512d0.ngrok.io -> localhost:5000`. To upload folders I was using `curl` combined to `tar` or `zip`.

```bash
tar zcf - /var/www | curl --data-binary @- https://f81512d0.ngrok.io/www.tgz
zip -rq - /var/www | curl --data-binary @- https://f81512d0.ngrok.io/www.zip
```

In this example, I was uploading `/var/www` folder as `www.tgz` or `www.zip` archive. This way I saved all files which stuck on the dying Ubuntu.

## Aftermath

After the epic fail experience I was thinking about how it can be done differently. Of course, making a backup would save me a couple of days. Also reading the documentation more attentively would speed up the restoring stage, since I didn't know I could [`ssh` to the recovery droplet](https://www.digitalocean.com/docs/droplets/resources/recovery-iso/#migrate-files){:target="_blank"} directly. Instead, I was working in a constraint that the recovery droplet cannot be reached from the internet.

The source code is [here](https://github.com/gaevoy/Gaev.Blog.Examples/tree/2.7.0/Gaev.Blog.Examples.FileReceiver){:target="_blank"}.
