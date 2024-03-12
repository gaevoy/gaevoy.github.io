---
layout: null
---
drop table if exists posts;
drop table if exists posts_fts;

create table main.posts
(
    url         TEXT
        constraint url primary key,
    tags        TEXT,
    title       TEXT,
    description TEXT,
    content     TEXT
);

create virtual table posts_fts using fts5(url, tags, title, description, content);

{% for post in site.posts %}
-- {{ post.date | date: "%a, %d %b %Y %H:%M:%S %z" }}
insert into posts (url, tags, title, description, content)
values ('https://gaevoy.com{{ post.url }}', '{{ post.tags | join: " " }}', '{{ post.title | replace: "'", "''" }}', '{{ post.description | replace: "'", "''" }}', '{{ post.content | strip_html | replace: "'", "''" }}');
{% endfor %}

insert into posts_fts (url, tags, title, description, content) select url, tags, title, description, content from posts;
