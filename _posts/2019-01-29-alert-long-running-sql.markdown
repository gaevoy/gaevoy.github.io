---
published: true
title: How to alert on long-running SQL queries in .NET
layout: post
tags: [csharp, dotnet, MiniProfiler, AdoNet, EntityFramework]
comments: true
---

In any application, it is natural that developers change its source code quite frequently to release new a feature or to fix a bug. Along with source code changes the developers introduce new bugs :) It is also okay, we are not robots yet. 

In order to ensure the application works even after changes, automated tests are written.

## Problem

There are such bugs that live on production only, for instance, because of database differs then the developers have. One of such is long-running SQL queries. So even the application which is 100% covered by tests may still have bugs on production.

(╯°□°）╯︵ ┻━┻

It would be nice to alert on long-running SQL queries via email for instance! How can it be done simply without changing tones of existing source code?

## Solution

Stack Overflow will help literally because they implemented a really cool library. [MiniProfiler](https://miniprofiler.com/) is .NET profiler with [ADO.NET](https://miniprofiler.com/dotnet/HowTo/ProfileSql), LINQ-to-SQL, [Entity Framework](https://miniprofiler.com/dotnet/HowTo/ProfileEF6) capabilities. Moreover, it is highly extensible so I can measure the duration of the SQL query and alert if it is large. The simplest way to alert can be any logger, for example, NLog with its [Mail  target](https://github.com/nlog/NLog/wiki/Mail-target).

The core idea is implemented in `LongRunningQueryProfiler` ([full version](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.0.0/Gaev.Blog.Examples.SqlQueryLogger/LongRunningQueryProfiler.cs))

```c#
public class LongRunningQueryProfiler : MiniProfiler, IDbProfiler
{
    private readonly TimeSpan _threshold;
    private readonly ILogger _logger;

    private readonly ConcurrentDictionary<DbCommandKey, Stopwatch> _inProgress =
        new ConcurrentDictionary<DbCommandKey, Stopwatch>();

    public LongRunningQueryProfiler(ILogger logger, TimeSpan threshold) 
        : base(null, DefaultOptions)
    {
        _threshold = threshold;
        _logger = logger;
    }

    public void ExecuteStart(IDbCommand command, SqlExecuteType type)
    {
        DbCommandKey id = Tuple.Create((object) command, type);
        _inProgress[id] = Stopwatch.StartNew();
    }

    public void ExecuteFinish(IDbCommand command, SqlExecuteType type, DbDataReader _)
    {
        DbCommandKey id = Tuple.Create((object) command, type);
        if (_inProgress.TryRemove(id, out Stopwatch stopwatch) && stopwatch.Elapsed > _threshold)
            _logger.Warn("{LongRunningQuery}", new
            {
                stackTrace = StackTraceSnippet.Get(Options),
                sql = command.CommandText,
                elapsed = (long) stopwatch.Elapsed.TotalMilliseconds
            });
    }
}

```
And that's it. Let's have a try in the test [full version](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.0.0/Gaev.Blog.Examples.SqlQueryLogger/AlertLongRunningAdoNetQueriesTests.cs):
```c#
[Test]
public async Task It_should_alert_ADO_NET_SQL_queries()
{
    // Given
    var logger = new TestLogger();
    var profiler = new LongRunningQueryProfiler(logger, threshold: 100.Milliseconds());
    var connectionFactory = new DbConnectionFactory(ConnectionString, profiler);
    var con = await connectionFactory.Open();

    // When
    var cmd = con.CreateCommand();
    cmd.CommandText = "WAITFOR DELAY '00:00:00.200'; SELECT '123' as 'Test'";
    using (var dtr = await cmd.ExecuteReaderAsync())
        while (await dtr.ReadAsync())
        {
        }

    // Then
    Assert.That(logger.Warnings.Any(e => e.sql == cmd.CommandText), Is.True);
}
```

Where `TestLogger` is an implementation of the logger to capture warnings. `DbConnectionFactory` is connection factory which wraps `SqlConnection` into `ProfiledDbConnection`. It must be used everywhere in the application for creating a database connection to make the alerts work.
```c#
public class DbConnectionFactory
{
    private readonly string _connectionString;
    private readonly IDbProfiler _profiler;

    public DbConnectionFactory(string connectionString, IDbProfiler profiler)
    {
        _connectionString = connectionString;
        _profiler = profiler;
    }

    public async Task<DbConnection> Open()
    {
        var connection = new ProfiledDbConnection(new SqlConnection(_connectionString), _profiler);
        await connection.OpenAsync();
        return connection;
    }
}
```
Also, [I wrote tests for EntityFramework](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.0.0/Gaev.Blog.Examples.SqlQueryLogger/AlertLongRunningEfQueriesTests.cs).

## Entity Framework profiler pitfalls

Once `EF6` profiler is enabled you must treat `LongRunningQueryProfiler` instance as a singleton. Because of `MiniProfiler.EF6` library accesses the profiler via [MiniProfiler.Current](https://github.com/MiniProfiler/dotnet/blob/v4.0.138/src/MiniProfiler.EF6/EFProfiledDbProviderServices.cs#L64). Also, don't use Entity Framework before initialization. The initialization logic will look something like this
 ```c#
var profiler = new LongRunningQueryProfiler(_logger, threshold: 2000.Milliseconds());
MiniProfiler.DefaultOptions.ProfilerProvider = new ProfilerGetter(profiler);
MiniProfilerEF6.Initialize();
```
After that, you must use `MiniProfiler.Current` ONLY!

The full version of given example is [here](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.0.0/Gaev.Blog.Examples.SqlQueryLogger/). Party!
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