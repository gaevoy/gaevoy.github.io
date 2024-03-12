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

{% assign title = post.title %}
{% assign title = title | replace: "'", "''" %}

{% assign description = post.description %}
{% assign description = description | replace: "'", "''" %}

{% assign content = post.content %}
{% assign content = content | replace: '<a ', '__a__' | replace: '</a>', '__/a__' %}
{% assign content = content | strip_html %}
{% assign content = content | replace: '__a__', '<a ' | replace: '__/a__', '</a>' %}
{% assign content = content | replace: "'", "''" %}

insert into posts (url, tags, title, description, content)
values ('https://gaevoy.com{{ post.url }}', '{{ post.tags | join: " " }}', '{{ title }}', '{{ description }}', '{{ content }}');
{% endfor %}

insert into posts_fts (url, tags, title, description, content) select url, tags, title, description, content from posts;
