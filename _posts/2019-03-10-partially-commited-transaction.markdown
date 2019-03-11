---
published: true
title: Partially committed transaction trap via .NET and MS SQL 
description: Discovering when .NET TransactionScope can be out of sync with MS SQL transaction. What consequences it can lead to. How to fix.
layout: post
tags: [TransactionScope, MSSQL, deadlock, dotnet, MiniProfiler]
comments: true
---

At some point, on the project where I'm working on we were starting to observe strange exception. 

```text
The COMMIT TRANSACTION request has no corresponding BEGIN TRANSACTION
``` 

Which has even more strange stack trace, pointing to `Dispose` method of `TransactionScope`.

```text
System.Transactions.TransactionAbortedException: The transaction has aborted. ---> System.Data.SqlClient.SqlException: The COMMIT TRANSACTION request has no corresponding BEGIN TRANSACTION.
   at System.Data.SqlClient.SqlInternalConnection.OnError(SqlException exception, Boolean breakConnection, Action`1 wrapCloseInAction)
   at System.Data.SqlClient.TdsParser.ThrowExceptionAndWarning(TdsParserStateObject stateObj, Boolean callerHasConnectionLock, Boolean asyncClose)
   at System.Data.SqlClient.TdsParser.TryRun(RunBehavior runBehavior, SqlCommand cmdHandler, SqlDataReader dataStream, BulkCopySimpleResultSet bulkCopyHandler, TdsParserStateObject stateObj, Boolean& dataReady)
   at System.Data.SqlClient.TdsParser.Run(RunBehavior runBehavior, SqlCommand cmdHandler, SqlDataReader dataStream, BulkCopySimpleResultSet bulkCopyHandler, TdsParserStateObject stateObj)
   at System.Data.SqlClient.TdsParser.TdsExecuteTransactionManagerRequest(Byte[] buffer, TransactionManagerRequestType request, String transactionName, TransactionManagerIsolationLevel isoLevel, Int32 timeout, SqlInternalTransaction transaction, TdsParserStateObject stateObj, Boolean isDelegateControlRequest)
   at System.Data.SqlClient.SqlInternalConnectionTds.ExecuteTransactionYukon(TransactionRequest transactionRequest, String transactionName, IsolationLevel iso, SqlInternalTransaction internalTransaction, Boolean isDelegateControlRequest)
   at System.Data.SqlClient.SqlDelegatedTransaction.SinglePhaseCommit(SinglePhaseEnlistment enlistment)
   --- End of inner exception stack trace ---
   at System.Transactions.TransactionStateAborted.EndCommit(InternalTransaction tx)
   at System.Transactions.CommittableTransaction.Commit()
   at System.Transactions.TransactionScope.InternalDispose()
   at System.Transactions.TransactionScope.Dispose()
```

The source code that throws the exception is using `TransactionScope` but the exception is thrown not always so it is not obvious on how to reproduce. In logs, I have found `SqlException: Transaction was deadlocked` which is close in time to the exception above. Meaning, they are somehow connected to each other.

> `TransactionScope` is a simple way to handle transactions in .NET. It is a class which provides a simple way to make a set of operations as part of a transaction without worrying about the complexity behind the scene. If any of the operation fails in between, entire transaction would fail and rolled back which undo all the operation that got completed. All this would be taken care by the framework, ensuring the data consistency. — [Brij Bhushan Mishra](https://codewala.net/2018/02/06/transactionscope-a-simple-way-to-handle-transactions-in-net/)

## Problem

After some time exploring `StackOverflow` I reproduced the issue by the following test.

```c#
[Test]
public void Reproduction()
{
    TestDelegate act = () =>
    {
        // Given
        using (var transaction = new TransactionScope())
        {
            // When
            ExecuteSql("INSERT Logs VALUES(1)");
            RetryIfDeadlock(iteration =>
            {
                if (iteration == 1)
                    SimulateDeadlock();
                else
                    ExecuteSql("INSERT Logs VALUES(2)");
            });
            ExecuteSql("INSERT Logs VALUES(3)");
            transaction.Complete();
        }
    };
    // Then
    Assert.Multiple(() =>
    {
        Assert.That(act, Throws.Nothing);
        Assert.That(GetLogs(), Is.EquivalentTo(new[] {1, 2, 3}));
    });
}
```

Where  
* [Logs table](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.7.0/Gaev.Blog.Examples.TransactionScopeFailure/PartiallyCommittedTransactionTests.cs#L145) is `MS SQL` table having `Id` column as `int`.
* [ExecuteSql](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.7.0/Gaev.Blog.Examples.TransactionScopeFailure/PartiallyCommittedTransactionTests.cs#L148-L157) is a shortcut to run the SQL query.
* [RetryIfDeadlock](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.7.0/Gaev.Blog.Examples.TransactionScopeFailure/PartiallyCommittedTransactionTests.cs#L170-L187) is retry strategy if transaction deadlock happens.
* [SimulateDeadlock](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.7.0/Gaev.Blog.Examples.TransactionScopeFailure/PartiallyCommittedTransactionTests.cs#L159-L168) is `MS SQL` bug which I exploit to simulate transaction deadlock.

Of course, the test fails. Despite the exception above, it shows that the transaction is partially committed. See log #2 and #3 have inserted but #1 is not. What a surprise!

```text
Multiple failures or warnings in test:
  1)   Expected: No Exception to be thrown
  But was:  <System.Transactions.TransactionAbortedException: The transaction has aborted. ---> System.Data.SqlClient.SqlException: The COMMIT TRANSACTION request has no corresponding BEGIN TRANSACTION.
  2)   Expected: equivalent to < 1, 2, 3 >
  But was:  < 2, 3 >
  Missing (1): < 1 >
```

Let's simplify the test by removing retry logic.

```c#
[Test]
public void Reproduction()
{
    TestDelegate act = () =>
    {
        // Given
        using (var transaction = new TransactionScope())
        {
            // When
            ExecuteSql("INSERT Logs VALUES(1)");
            try { SimulateDeadlock(); } catch (Exception) { }
            ExecuteSql("INSERT Logs VALUES(2)");
            ExecuteSql("INSERT Logs VALUES(3)");
            transaction.Complete();
        }
    };
    // Then
    Assert.Multiple(() =>
    {
        Assert.That(act, Throws.Nothing);
        Assert.That(GetLogs(), Is.EquivalentTo(new[] {1, 2, 3}));
    });
}

```

The test fails with the same result. We can simplify even more by running an incorrect SQL query instead of deadlock simulation.

```c#
[Test]
public void Reproduction()
{
    TestDelegate act = () =>
    {
        // Given
        using (var transaction = new TransactionScope())
        {
            // When
            ExecuteSql("INSERT Logs VALUES(1)");
            try { ExecuteSql("INSERT Logs VALUES('oops')"); } catch (Exception) { }
            ExecuteSql("INSERT Logs VALUES(2)");
            ExecuteSql("INSERT Logs VALUES(3)");
            transaction.Complete();
        }
    };
    // Then
    Assert.Multiple(() =>
    {
        Assert.That(act, Throws.Nothing);
        Assert.That(GetLogs(), Is.EquivalentTo(new[] {1, 2, 3}));
    });
}
```

The reason for such strange behavior I have found on [StackOverflow]( https://stackoverflow.com/a/5623877/1400547). The transaction rolls back automatically and implicitly if [some types of errors](https://stackoverflow.com/a/32202657/1400547) are thrown, like `SqlException: Transaction was deadlocked` or `SqlException: Conversion failed`. Because of error suppression, `TransactionScope` becomes out of sync with `MS SQL` transaction so obviously, its `Dispose` fails by saying that the transaction has already been finished.

## Solution

Underspending the root of the problem gives a clear explanation — don't suppress SQL exceptions within `TransactionScope`! Respecting this, in my opinion, we have a few options in order to fix the issue.

### 1. Don't retry on transaction deadlock error, let it fail

Either fix the source of the deadlock or remove retry logic on transaction deadlock error. Let it fail, it is better than data inconsistency.

### 2. Retry entire transaction block

Back to reality. If you have layered architecture, I mean layers of legacy code :) it may be hard to fix the source of the deadlock. The following option is for you to consider.

```c#
[Test]
public void Fix()
{
    RetryIfDeadlock(iteration =>
    {
        // Given
        using (var transaction = new TransactionScope())
        {
            // When
            ExecuteSql("INSERT Logs VALUES(1)");
            if (iteration == 1)
                SimulateDeadlock();
            else
                ExecuteSql("INSERT Logs VALUES(2)");
            ExecuteSql("INSERT Logs VALUES(3)");
            transaction.Complete();
        }
    });
    // Then
    Assert.That(GetLogs(), Is.EquivalentTo(new[] {1, 2, 3}));
}
```

### 3. Run retries outside of the transaction

This option is dangerous so it is up to you to choose! `TransactionScope(TransactionScopeOption.Suppress)` executes its inner code block outside of the transaction!! Meaning, if the transaction is rolled back the inner code block won't be rolled back!!! It can lead to the same partially committed transaction. However, it can be helpful for none mission critical operations like log insertion.

```c#
[Test]
public void Fix()
{
    // Given
    using (var transaction = new TransactionScope())
    {
        // When
        ExecuteSql("INSERT Logs VALUES(1)");
        using (new TransactionScope(TransactionScopeOption.Suppress))
            RetryIfDeadlock(iteration =>
            {
                if (iteration == 1)
                    SimulateDeadlock();
                else
                    ExecuteSql("INSERT Logs VALUES(2)");
            });
        ExecuteSql("INSERT Logs VALUES(3)");
        transaction.Complete();
    }
    // Then
    Assert.That(GetLogs(), Is.EquivalentTo(new[] {1, 2, 3}));
}
```

You can find the tests in [Gaev.Blog.Examples.TransactionScopeFailure](https://github.com/gaevoy/Gaev.Blog.Examples/tree/1.7.0/Gaev.Blog.Examples.TransactionScopeFailure).

## Sidenote

At the very beginning of my investigation, it was hard to log the deadlock exceptions since we are using [EnterpriseLibrary.TransientFaultHandling](https://www.nuget.org/packages/EnterpriseLibrary.TransientFaultHandling/) for retry logic. It suppresses all exceptions during retries. So I used `MiniProfiler` to plug into ADO.NET and log all SQL exceptions.

Read [this article on how to do it](https://gaevoy.com/2019/01/29/alert-long-running-sql.html) and take a look to specifically [this code block](https://github.com/gaevoy/Gaev.Blog.Examples/blob/1.0.0/Gaev.Blog.Examples.SqlQueryLogger/LongRunningQueryProfiler.cs#L50-L60) which actually logs SQL exception + related SQL query.