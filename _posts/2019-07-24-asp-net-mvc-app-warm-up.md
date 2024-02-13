---
published: true
title: ASP.NET MVC app warm-up
description: How to warm-up ASP.NET MVC app if it is impossible to call controller action via headless browser due to sophisticated authentication procedure?
layout: post
tags: [csharp, aspnet]
comments: true
---

I'm pretty sure you have seen application slow down just after deploying yet another release into production. Yeah, that's a side effect of using one of the [just-in-time compilation](<https://en.wikipedia.org/wiki/Just-in-time_compilation>){:target="_blank"}-based languages such as `C#` or `Java`. But not only `JIT` is guilty in a slow cold start. But also an initialization logic which usually is run on the first call.

To get rid of slow cold start, the application is warmed-up after deploying a new release but before routing production traffic into it. The simplest possible way to warm-up is to open URLs belong to the app. Go ahead, if it works for you. But what if that URLs cannot be accessible without a sign-in? For example, [multi-factor authentication](https://en.wikipedia.org/wiki/Multi-factor_authentication){:target="_blank"} is enabled for every user so it is not possible to sign-in via one of headless browser or just `HttpClient`.

Let's see how I managed to warm-up `ASP.NET MVC` using built-in `@Html.RenderAction("Action", "Controller")`. For sure `RenderAction` can help us but before that, we have to fake a sign-in so a page would think the current user is legitimate. 

The very 1st step is `HttpContext` creation. Here is how to create a new one.

```c#
HttpContext NewHttpContext(string requestUrl, IPrincipal currentUser)
{
    var request = new HttpRequest("", requestUrl, "");
    var response = new HttpResponse(TextWriter.Null);
    return new HttpContext(request, response) {User = currentUser};
}
```

`requestUrl` must point to a real request URL. For instance, if you are in `ASP.NET MVC` controller, `Request.Url.AbsoluteUri` is perfect for this. Otherwise, you may see the following exception.

```
System.ArgumentException: The virtual path '/' maps to another application, which is not allowed.
   at System.Web.CachedPathData.GetVirtualPathData(VirtualPath virtualPath, Boolean permitPathsOutsideApp)
   at System.Web.HttpContext.GetFilePathData()
   at System.Web.Configuration.RuntimeConfig.GetConfig(HttpContext context)
   at System.Web.Configuration.HttpCapabilitiesBase.GetBrowserCapabilities(HttpRequest request)
   at System.Web.HttpRequest.get_Browser()
   ...
   at System.Web.Mvc.HttpHandlerUtil.ServerExecuteHttpHandlerWrapper.Wrap[TResult](Func`1 func)
   at System.Web.HttpServerUtility.ExecuteInternal(IHttpHandler handler, TextWriter writer, Boolean preserveForm, Boolean setPreviousPage, VirtualPath path, VirtualPath filePath, String physPath, Exception error, String queryStringOverride)
```

In my case, the authenticated user will be like the following. As you can see it is super easy to change a set of roles or user name.

```c#
class WarmUpUser : IPrincipal, IIdentity
{
    public bool IsInRole(string role) => true;
    public IIdentity Identity => this;
    public string Name { get; } = "Warm-up user";
    public string AuthenticationType { get; } = "";
    public bool IsAuthenticated { get; } = true;
}
```

Most probably, you have played with `@Html` in `Razor` view. But I will use it in a controller. Since `@Html` is a type of `HtmlHelper` let's try to create it. The following code is not trivial, however, it is as short as I could do.

```c#
static HtmlHelper CreateHtmlHelper(HttpContext httpContext)
{
    var controller = new NullController();
    var requestContext = new RequestContext(
        new HttpContextWrapper(httpContext),
        new RouteData());
    var controllerContext = new ControllerContext(requestContext, controller);
    controller.ControllerContext = controllerContext;
    var viewContext = new ViewContext(
        controllerContext,
        new NullView(),
        new ViewDataDictionary(),
        new TempDataDictionary(),
        TextWriter.Null);
    return new HtmlHelper(viewContext, new ViewPage());
}

class NullController : ControllerBase
{
    protected override void ExecuteCore()
        => throw new NotImplementedException();
}

class NullView : IView
{
    public void Render(ViewContext _, TextWriter __)
        => throw new NotImplementedException();
}
```

Finally, we can get all the pieces together and warm-up.

```c#
[AllowAnonymous]
public class WarmUpController : Controller
{
    public async Task Index()
    {
        await Task.WhenAll(
            WarmUp(html => html.RenderAction("Index", "Home")),
            WarmUp(html => html.RenderAction("About", "Home")),
            WarmUp(html => html.RenderAction("Contact", "Home"))
        );
    }

    Task WarmUp(Action<HtmlHelper> act)
    {
        return Task.Factory.StartNew(() =>
        {
            var requestUrl = Request.Url.AbsoluteUri;
            var httpContext = NewHttpContext(requestUrl, new WarmUpUser());
            System.Web.HttpContext.Current = httpContext;
            var htmlHelper = CreateHtmlHelper(httpContext);
            act(htmlHelper);
        }, TaskCreationOptions.LongRunning);
    }
    ...
}
```

`Task.Factory.StartNew` executes the warm-up within good thread isolation. Remember that the warm-up renders controller actions in `TextWriter.Null`, in our case that's okay. Bonus feature: Intellisense can still navigate you to the сorresponding controller action!

Be careful, this approach is applicable for `.NET Framework` only and I have not tested on `.NET Core`!

Source code of simple `ASP.NET MVC` app with the warm-up controller is in here [Gaev.Blog.Examples.WarmUpAspNetMvc](https://github.com/gaevoy/Gaev.Blog.Examples/tree/2.3.0/Gaev.Blog.Examples.WarmUpAspNetMvc){:target="_blank"}. Don't forget to let me know how do you warm-up :)
