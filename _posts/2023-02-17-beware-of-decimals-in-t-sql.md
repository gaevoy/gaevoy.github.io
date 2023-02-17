---
published: true
title: Beware of `decimal` in `Microsoft SQL Server`
description: This article shows how decimal type in Microsoft SQL Server can lead to unexpected results and how to fix that.
layout: post
tags: [mssql, postgresql, sql]
comments: true
---

Every year, we adjust prices for services according to the inflation rate and some business requirements. This year we have got new requirements to increase and round the prices according to specific business rules. We use Microsoft SQL Server and the prices are stored there. To update prices we should implement SQL script. Nothing fancy, except after executing the SQL script update customers started to complain about strange price changes. It turned out that SQL Server `decimal` type behaves totally unobvious. I would like to share our unexpected findings. 

![people shocked](/img/beware-of-decimals-in-t-sql/family_scream.jpg "people shocked" ){:style="max-width:500px; width:100%;" class="block-center"}

## Problem

For me, as C# developer `decimal` type is always associated with financial calculations. This is clearly written here:

> `Decimal` value type is appropriate for financial calculations that require large numbers of significant integral and fractional digits and no round-off errors — [Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/api/system.decimal)

So it was obvious to choose `decimal` for the price change task. Let's see the SQL function we have implemented to adjust and round. It increases the prices to 10% and then round depending on the currency.

```tsql
create function dbo.AdjustAndRound(@currency varchar(max), @price decimal) returns decimal as
begin
  if @currency = 'EUR'
    return round(@price * 1.10, 2);
  return floor(@price * 1.10);
end
```

As a result, `Expected` column is what we expected to get, `Actual` column is what customers actually have got.

|Currency|Price|Expected| Actual |
|--------|-----|--------|--------|
|EUR     |0.4  |0.4400  | 0      |
|EUR     |1.2  |1.3200  | 1      |
|EUR     |1.6  |1.7600  | 2      |
|DKK     |59.2 |65.0000 | 64     |
|DKK     |59.6 |65.0000 | 66     |

Nice price adjustment especially for those customers who received `0` price :) But, how come?

It turned out `decimal` is an alias for `decimal(18,0)` where `0` is the number of decimal digits that are stored to the right of the decimal point. Meaning, a provided value will be rounded to the nearest integer. Well, it was not expected, especially after C#. Good job `SQL Server` team confusing people. I double-checked `decimal` type on `PostgreSQL`, and it works as expected.

To sum up the problem, the following SQL query will return `100` in `SQL Server` and `99.50` in `PostgreSQL`. `100` is not what I would expect.

```sql
select cast(99.50 as decimal);
```

## Solution

`decimal` type has 2 arguments in `Microsoft SQL Server` and basically in any other database engines, including `PostgreSQL`:
* `precision` - the maximum total number of decimal digits to be stored.
* `scale` - the number of decimal digits that are stored to the right of the decimal point.

However, that arguments are optional and have default values: `precision = 18`, `scale = 0`. For me, this was a really strange choice having `scale = 0` as default, making `decimal` to behave like `int`.

Knowing this, there is an easy fix is to explicitly provide the required `scale` so the `AdjustAndRound` function will look like this:

```tsql
create function dbo.AdjustAndRound(@currency varchar(max), @price decimal(10,4)) returns decimal(10,4) as
begin
  if @currency = 'EUR'
    return round(@price * 1.10, 2);
  return floor(@price * 1.10);
end
```

And now it works as expected.

## Takeaways

* Never use `decimal` type without explicit arguments in `Microsoft SQL Server`.
* Ask your teammate to solve `select iif(cast(0.1 + 0.2 as decimal) = 0, 'true', 'false')`.
* Play with this issue on `db<>fiddle` without installing `SQL Server`: [here](https://dbfiddle.uk/5eEq0dGI) and [there](https://dbfiddle.uk/CVwn-0ej). 
* See a similar issue on [StackOverflow](https://stackoverflow.com/a/23016604).
