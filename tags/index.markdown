---
layout: default
title: Tag
---

{% assign tags = "" | split:"" %}
{% for t in site.tags %}
  {% assign tags = tags | push: t[0] %}
{% endfor %}
{% assign sorted_tags = tags | sort_natural %}

<h1 class="py1"><i class="fas fa-tags"></i> Tags</h1>
<div class="tags-expo">
  <div class="tags-expo-list">
    {% for tag in sorted_tags %}
    <a href="#{{ tag | slugify }}" class="post-tag">{{ tag }}</a>
    {% endfor %}
  </div>
  <div class="tags-expo-section">
    {% for tag in sorted_tags %}
    <h2 id="{{ tag | slugify }}"><i class="fas fa-tag"></i> {{ tag }}</h2>
    <ul class="tags-expo-posts">
      {% for post in site.tags[tag] %}
        <a class="post-title" href="{{ site.baseurl }}{{ post.url }}">
      <li>
        {{ post.title }}
      <small class="post-date">{{ post.date | date_to_string }}</small>
      </li>
      </a>
      {% endfor %}
    </ul>
    {% endfor %}
  </div>
</div>
<div style="height: 500px;"></div>
