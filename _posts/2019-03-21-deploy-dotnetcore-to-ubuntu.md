---
published: true
title: Lightning-fast deployment of .NET Core app over SSH
description: Applying KISS principle in order to deploy .NET Core app over SSH as simple as possible.
layout: post
tags: [dotnet-core, ssh, linux]
comments: true
---

Once in a while, I want to try some idea to implement. Having background by developing mostly in `.NET` stack my choice is obviously `.NET Core`. I always have at hand couple of `Linux` servers: one is in `DigitalOcean`, another one is [MSI Cubi N](https://www.msi.com/Desktop/Cubi-N.html) under my TV set. Hence, my `Linux` horses will run `.NET Core` app.

My yet another brilliant idea is waiting for implementation. Wait a minute! It will not happen without a [continuous integration](https://en.wikipedia.org/wiki/Continuous_integration) server which is triggered by GitHub in order to prepare a release package. And, don't forget about a [continuous delivery](https://en.wikipedia.org/wiki/Continuous_delivery) server, how can we deploy without it? Probably, it is even better to set up [Kubernetes](https://kubernetes.io/) cluster. Right? No way! That's not for me. I would like to have something as simple as possible. [KISS principle](https://en.wikipedia.org/wiki/KISS_principle) after all!

How minimal deployment script will look like? I'm going to deploy to my `MSI Cubi N` that has `192.168.2.4`. After a couple of evenings googling and debugging the script is ready. It uses [rsync](https://en.wikipedia.org/wiki/Rsync) in order to upload only changed files, [systemd](https://en.wikipedia.org/wiki/Systemd) for running the console app as service and restarting in case of failure.

```bash
#!/bin/bash
ssh root@192.168.2.4 'bash -s' <<'ENDSSH'
printf "Stopping service...\n"
systemctl stop HelloSshDeploy
printf "Service is "
systemctl is-active HelloSshDeploy
mkdir -p /apps/HelloSshDeploy
ENDSSH
printf "Uploading new version of service...\n"
rsync -v -a ./bin/Release/netcoreapp2.2/ubuntu.16.04-x64/publish/ root@192.168.2.4:/apps/HelloSshDeploy/
ssh root@192.168.2.4 'bash -s' <<'ENDSSH'
chmod 777 /apps/HelloSshDeploy/Gaev.Blog.Examples.HelloSshDeploy
if [[ ! -e /etc/systemd/system/HelloSshDeploy.service ]]; then
    printf "Installing service...\n"
    cat > /etc/systemd/system/HelloSshDeploy.service <<'EOF'
    [Unit]
    Description=HelloSshDeploy
    After=network.target
    
    [Service]
    WorkingDirectory=/apps/HelloSshDeploy
    ExecStart=/apps/HelloSshDeploy/Gaev.Blog.Examples.HelloSshDeploy
    Restart=always
    KillSignal=SIGINT
    
    [Install]
    WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable HelloSshDeploy
fi
printf "Starting service...\n"
systemctl start HelloSshDeploy
printf "Service is "
systemctl is-active HelloSshDeploy
ENDSSH
```

My `.NET Core` console app is super small. I'm using  `Console.CancelKeyPress` here to respect `Ctrl + C` and `SIGINT` signal which is sent by `Linux` to stop the console app.

```c#
class Program
{
    static async Task Main(string[] args)
    {
        var cancellation = new CancellationTokenSource();
        Console.CancelKeyPress += (_, e) => { e.Cancel = true; cancellation.Cancel(); };
        using (var logger = new LoggerConfiguration()
            .WriteTo.Console()
            .WriteTo.File("HelloSshDeploy.log")
            .CreateLogger())
            await RunApplication(logger, cancellation.Token);
    }
    static async Task RunApplication(Logger logger, CancellationToken cancellation)
    {
        logger.Information("Hello World!");
        try
        {
            await Task.Delay(Timeout.Infinite, cancellation);
        }
        catch (TaskCanceledException) { }
        logger.Information("Goodbye World!");
    }
}
```

### Prerequisites for deployment over SSH

* `Linux` machine itself: for instance, you can start from $5/mo machine by [DigitalOcean](https://www.digitalocean.com/); 
* [ssh](https://en.wikipedia.org/wiki/Secure_Shell) & [rsync](https://en.wikipedia.org/wiki/Rsync) on your machine must be installed. For `Windows` users, the easiest way is to install `Ubuntu` for `Windows 10` via [Windows Subsystem for Linux](https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux);
* password-less `SSH` login must be configured in target `Linux` machine. [ssh-copy-id](https://www.ssh.com/ssh/copy-id) to the rescue;
* [root login over SSH](https://stackoverflow.com/a/18395932/1400547) must be enabled in target `Linux` machine.

Finally, it takes 4 seconds in order to deploy. See the execution result of the following commands:

```bash
./make.sh
./deploy.sh
```

![Deployment over SSH](/img/deploy-over-ssh.png "Deployment over SSH" ){:style="max-width:1827px; width:100%;" class="block-center"}

See source code here [Gaev.Blog.Examples.HelloSshDeploy](https://github.com/gaevoy/Gaev.Blog.Examples/tree/1.8.0/Gaev.Blog.Examples.HelloSshDeploy).