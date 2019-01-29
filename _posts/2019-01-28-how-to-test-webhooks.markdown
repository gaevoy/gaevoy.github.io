---
published: true
title: How to test Webhooks
layout: post
tags: [csharp, dotnet, webhook, nunit, sendgrid, ngrok]
comments: true
---

During integrating with [SendGrid's webhook](https://sendgrid.com/docs/API_Reference/Event_Webhook/getting_started_event_webhook.html) in order to get status of email delivery I came across obstacles on how to test it. Because I'm a lazy developer I wanted to have an automated test for my integration. But it is not obvious how to do that from the first sight.

The webhook works this way that external system calls my application's API. It means I have to run/host API right in the test so it will be available for external consumers such as `SendGrid`.

## Problem

I don't have a public IP address on my computer where I'm going to run the test. The computer is under NAT. How to expose a local port from my computer to the internet? Even more, `SendGrid` requires to have HTTPS enabled. (╯°□°）╯︵ ┻━┻ I have to overcome this problem as well. 

`SendGrid` suggested to looking into [ngrok](https://sendgrid.com/blog/test-webhooks-ngrok/).

## Solution

[ngrok](https://ngrok.com/product) can expose local port to the internet via HTTPS. Moreover, I can control `ngrok` via its API in order to get the public address for the port. Here is a small wrapper around `ngrok`:

```c#
public class NgrokTunnel : IDisposable
{
    private readonly Process _process;

    public NgrokTunnel(int localPort)
    {
        _process = new Process
        {
            StartInfo = new ProcessStartInfo("ngrok", "http " + localPort)
            {
                WindowStyle = ProcessWindowStyle.Minimized
            }
        };
        _process.Start();
    }

    public string PublicTunnelUrl
    {
        get
        {
            for (int i = 0; i <= 10; i++)
                try
                {
                    var ngrokApi = "http://127.0.0.1:4040/api/tunnels/command_line";
                    var json = new WebClient().DownloadString(ngrokApi);
                    return (string) JsonConvert.DeserializeObject<dynamic>(json).public_url;
                }
                catch (Exception)
                {
                    if (i == 10) throw;
                    Thread.Sleep(200);
                }
            throw new TimeoutException();
        }
    }

    public void Dispose()
    {
        _process.Kill();
    }
}
```
No more obstacles for writing the test. I'm going to send an email and wait until `SendGrid` gives me update about the status of email delivery via webhook call. Finally, the test is like this:

```c#
[Test]
public async Task It_should_listen_for_webhooks()
{
    // Given
    var messageId = Guid.NewGuid().ToString();
    var onWebhookReceived = new TaskCompletionSource<Webhook>();
    Task.Delay(TimeSpan.FromMinutes(3))
        .ContinueWith(_ => onWebhookReceived.TrySetCanceled());

    async Task OnWebhookAppeared(IOwinContext ctx, Func<Task> _)
    {
        var json = new StreamReader(ctx.Request.Body).ReadToEnd();
        var webhook = JsonConvert.DeserializeObject<Webhook[]>(json)
            .FirstOrDefault(e => e.MyId == messageId);
        if (webhook != null)
            onWebhookReceived.TrySetResult(webhook);
    }

    using (var localApi = new HttpServer().Use(OnWebhookAppeared).Start())
    using (var ngrok = new NgrokTunnel(localPort: localApi.ApiBaseUrl.Port))
    {
        // When
        await RegisterWebhookUrl(ngrok.PublicTunnelUrl);
        await SendTestEmail(messageId);

        // Then
        var webhook = await onWebhookReceived.Task;
        Assert.That(webhook, Is.Not.Null);
        Assert.That(webhook.Event, Is.EqualTo("processed"));
    }
}
```
How cool it is that `SendGrid` calls `OnWebhookAppeared` method written right in the test. `HttpServer` is a wrapper for `Microsoft.Owin`-thing to self-host my API. `RegisterWebhookUrl` and `SendTestEmail` methods are just calling SendGrid API. 

Once, the test is running you will see `ngrok` console window displaying its state and statistics:

![alt text](/img/ngrok-console.png "ngrok console")

After ~15 sec it becomes green!

![alt text](/img/SendGridClientTests-result.png "ngrok console")

```text
   _                             .-.
  / )  .-.    ___          __   (   )
 ( (  (   ) .'___)        (__'-._) (
  \ '._) (,'.'               '.     '-.
   '.      /  "\               '    -. '.
     )    /   \ \   .-.   ,'.   )  (  ',_)    _
   .'    (     \ \ (   \ . .' .'    )    .-. ( \
  (  .''. '.    \ \|  .' .' ,',--, /    (   ) ) )
   \ \   ', :    \    .-'  ( (  ( (     _) (,' /
    \ \   : :    )  / _     ' .  \ \  ,'      /
  ,' ,'   : ;   /  /,' '.   /.'  / / ( (\    (
  '.'      "   (    .-'. \       ''   \_)\    \
                \  |    \ \__             )    )
              ___\ |     \___;           /  , /
             /  ___)                    (  ( (
             '.'                         ) ;) ;
                                        (_/(_/
```
Since I'm using external systems (`SendGrid`, `ngrok`) the test can be unstable. Full version of the test is [here](https://github.com/gaevoy/Gaev.Blog.Examples/tree/1.0.0/Gaev.Blog.Examples.WebhookTests).