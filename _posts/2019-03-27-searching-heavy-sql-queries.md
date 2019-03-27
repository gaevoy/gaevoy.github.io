---
published: true
title: Searching for heavy T-SQL queries
description: Quick instruction I usually follow in order to find a SQL query which burns CPU of production SQL Server
layout: post
tags: [sql, mssql]
comments: true
---

At some point, you may start to see high CPU load on the SQL server, in my case, it happened after yet another release. So how quickly is it to find such SQL queries? Of course, I can review all changes that were released but I would say it is not as effective and fast as just asking SQL server directly what's going on. For that matter, I have the instruction with SQL queries that I usually use for searching and identifying heavy SQL queries.

More advanced solution could be to [set up an automatic alert on long-running SQL queries via .NET code](/2019/01/29/alert-long-running-sql.html) or enable database monitoring feature, something like [Query Performance Insight for Azure SQL](https://docs.microsoft.com/en-us/azure/sql-database/sql-database-query-performance).

## 1. Find heavy SQL queries in real time

If you are experiencing high CPU load right now this will show all SQL queries which currently running. Once the result is ready you can take the first SQL query and move on to the analysis step. Pay attention, the query itself can be listed in the output.

```sql
SELECT text, cpu_time, total_elapsed_time
FROM sys.dm_exec_requests
CROSS APPLY sys.dm_exec_sql_text(sql_handle)
ORDER BY cpu_time DESC
```

![Screenshot for heavy SQL queries in real time](/img/heavy-queries-in-real-time.png "Screenshot for heavy SQL queries in real time" ){:style="max-width:692px; width:100%;" class="block-center"}

## 2. Find recent heavy SQL queries

In case you cannot catch the moment of high CPU load, no problem. It is easy to query the SQL server performance statistic. So the following will return recently executed SQL query sorted by total CPU usage. Once performance statistic is ready you can take the first SQL query from the list and move to the analysis step.

```sql
SELECT TOP 20 
  total_worker_time/execution_count AS AvgCPU  
, total_worker_time AS TotalCPU
, total_elapsed_time/execution_count AS AvgDuration  
, total_elapsed_time AS TotalDuration  
, (total_logical_reads+total_physical_reads)/execution_count AS AvgReads 
, (total_logical_reads+total_physical_reads) AS TotalReads
, execution_count   
, text
FROM sys.dm_exec_query_stats
CROSS APPLY sys.dm_exec_sql_text(sql_handle)
ORDER BY TotalCPU DESC
```
![Screenshot for recent heavy SQL queries](/img/recent-heavy-queries.png "Screenshot for recent heavy SQL queries" ){:style="max-width:939px; width:100%;" class="block-center"}

## 3. SQL query analysis

Having in hands heavy SQL query that leads to high CPU load we can try to find a place in the source code in order to ~~blame~~ ask a teammate to help in optimizing since he or she is more in context of that. 

In order to find the associated line of code I usually look to `WHERE` clause, get field name from the expression, search for it in source code via text search. The text search (for instance hitting `Ctrl` + `Shift` + `F`) is needed because SQL query can be represented as a string as well as LINQ expression.

An alternative option is to optimize the SQL query itself by adding yet another index. `SQL Management Studio` can [suggest you on missing index](https://www.brentozar.com/archive/2013/07/dude-who-stole-my-missing-index-recommendation/) easily.

Please share in comments how you search for heavy SQL queries.