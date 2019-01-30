---
published: true
title: Process manager as async function in C#
layout: post
tags: [ProcessManager, saga, async, csharp, dotnet, NEventStore, AkkaNet]
comments: true
---

Once I'm thinking about CQRS, event sourcing and messaging my heart starts beating very fast. I will share my love and pain in this regard. I'm a huge fan of messaging and how great it is to communicate between applications via messages. Simple from the first sight but hard when you got there. Really hard! One of mind-blowing thing is [process manager](https://docs.microsoft.com/en-us/previous-versions/msp-n-p/jj591569(v%3dpandp.10)). The process manager is like a long-running transaction or long-running function. By the word "long-running" I mean 1 month, 1 year or forever, it does not matter. How hard it is to express process manager in source code? Let's elaborate a bit.

I remember the time when I was writing a process manager with the help of [NEventStore](https://github.com/NEventStore/NEventStore) like [this](https://github.com/gaevoy/NEventStore.Cqrs/blob/master/examples/PetProject.Books/Domain/AccountValueTranferring.cs). That's was truly good times and nothing wrong with this approach except the logic is scattered around methods of a class so it is really easy to lose a focus what's going on, especially if the logic is complicated and has branches. I was having a hard time reading/debugging such process manager's logic.

Things are much better when [Akka.NET](https://getakka.net/) is used with its [switchable behavior](https://petabridge.com/blog/akka-actors-finite-state-machines-switchable-behavior/). However, you have to learn yet another library and code branching is still not as representative as it could be. Can we do even better?

For a moment, just imagine regular `async` C# method so that the logic of process manager is out there. Due to nature of `async`/`await` it is not important how long the logic will run, even forever. Unless exception, crash or Windows update :) right? Come on, guys, it can be worked around.

Let's continue dreaming. Here is the process manager for onboarding a new user.

```c#
async Task OnboardNewUser(string id, string email)
{
    using (var proc = _host.Spawn(id))
    {
        // 1. Save the email not to lose if the task resumes
        email = await proc.Get(email, "email saved");
        // 2. Register the user
        var userId = await proc.Do(() => _service.RegisterUser(email), "registered");
        // 3. Generate a secret for the user
        var secret = await proc.Get(Guid.NewGuid(), "secret saved");
        // 4. Send the secret to the user to verify its email
        await proc.Do(() => _service.VerifyEmail(email, secret), "verification started");
        // 5. Wait when the user received the secret and send it back
        await proc.Do(() => _service.WaitForEmailVerification(secret), "verified");
        // 6. Activate the user
        await proc.Do(() => _service.ActivateUser(userId), "activated");
    }
}
```

Good news, this is part of the working example. I experimented a bit and came up to the implementation above. 

As you noticed from the name of the step, we have to store the state of each transition in order to resume if crap happens. It works exactly the same as event sourcing suggests to. Store complete history of messages in order for restoring one's state later. The experiment is capable to store async function state in [MS SQL as well as in file system](https://github.com/gaevoy/Gaev.DurableTask/tree/1.0.0/Gaev.DurableTask.Storage).

One more example with a really long-running process.
```c#
async Task StartMailflow(string id, string email)
{
	using (var proc = _host.Spawn(id))
	{
		// 1. Save email not to lose it if durable task resumes
		email = await proc.Get(email, "email saved");
		await proc.Do(() => _smtp.Send(email, "Welcome!"), "welcome sent");
		// 2. Wait 1 month
		await proc.Delay(TimeSpan.FromDays(30), "1m passed");
		await proc.Do(() => _smtp.Send(email, "Your 1st month with us. Congrats!"), "1m compliment sent");
		// 3. Wait 11 months
		await proc.Delay(TimeSpan.FromDays(365 - 30), "11m passed");
		await proc.Do(() => _smtp.Send(email, "Your 1st year with us. Congrats!"), "11m compliment sent");
	}
}
```

See more examples in [Gaev.DurableTask experiment](https://github.com/gaevoy/Gaev.DurableTask) including [one with branches](https://github.com/gaevoy/Gaev.DurableTask/blob/1.0.0/Gaev.DurableTask.ConsolePlayground/CreditCardFlow.cs#L26-L56).

Just thoughts, it is fairly easy to visualize current state where the process manager is currently on by showing a yellow line on top of the async function. Just a bit of JavaScript magic, but it is another story.

![alt text](/img/OnboardNewUser-saga.png "OnboardNewUser while debugging")

API and naming of `Gaev.DurableTask` is how I see it, of course, it can be confusing. More important is the idea of having an `async` function as a process manager. What do you think guys?