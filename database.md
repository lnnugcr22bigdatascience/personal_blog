# 个人博客系统 · 数据库设计

## 一、用户表 `users`

| 字段名     | 类型                | 约束                                          | 说明                               |
| ---------- | ------------------- | --------------------------------------------- | ---------------------------------- |
| id         | INT UNSIGNED        | PRIMARY KEY, AUTO_INCREMENT                   | 用户唯一标识                       |
| username   | VARCHAR(50)         | NOT NULL, UNIQUE                              | 用户名，登录用                     |
| email      | VARCHAR(100)        | NOT NULL, UNIQUE                              | 邮箱，登录用                       |
| password   | VARCHAR(255)        | NOT NULL                                      | 加密后的密码（bcrypt 等）          |
| avatar     | VARCHAR(255)        | DEFAULT NULL                                  | 头像 URL                           |
| created_at | DATETIME            | NOT NULL, DEFAULT CURRENT_TIMESTAMP           | 注册时间                           |
| updated_at | DATETIME            | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 资料更新时间                     |

> **设计说明**：  
> `password` 必须经过哈希（如 bcrypt）后存储，绝对不能存明文。  
> `updated_at` 会在行更新时自动刷新。

---

## 二、分类表 `categories`

| 字段名      | 类型          | 约束                                          | 说明         |
| ----------- | ------------- | --------------------------------------------- | ------------ |
| id          | INT UNSIGNED  | PRIMARY KEY, AUTO_INCREMENT                   | 分类唯一标识 |
| name        | VARCHAR(50)   | NOT NULL, UNIQUE                              | 分类名称     |
| description | VARCHAR(255)  | DEFAULT NULL                                  | 分类描述     |
| created_at  | DATETIME      | NOT NULL, DEFAULT CURRENT_TIMESTAMP           | 创建时间     |

> **设计说明**：  
> 分类表独立存在，方便动态增删分类，也为后续菜单、侧边栏等提供数据源。

---

## 三、标签表 `tags`（可选但推荐）

| 字段名     | 类型          | 约束                                          | 说明         |
| ---------- | ------------- | --------------------------------------------- | ------------ |
| id         | INT UNSIGNED  | PRIMARY KEY, AUTO_INCREMENT                   | 标签唯一标识 |
| name       | VARCHAR(30)   | NOT NULL, UNIQUE                              | 标签名称     |
| created_at | DATETIME      | NOT NULL, DEFAULT CURRENT_TIMESTAMP           | 创建时间     |

> **设计说明**：  
> 虽然文章表里会用 JSON 数组存标签，但建立独立的 `tags` 表可以实现以下好处：  
> - 统一的标签字典，避免同义标签（如 "js" 和 "JavaScript"）分散出现。  
> - 可以轻松生成标签云、统计每个标签下的文章数。  
> - 新增文章时，从前端展示的标签列表中选择，提升体验。  
> 你可以选择不建这张表，只用 JSON 数组，但后期扩展会很麻烦。

---

## 四、文章表 `articles`

| 字段名      | 类型          | 约束                                          | 说明                                             |
| ----------- | ------------- | --------------------------------------------- | ------------------------------------------------ |
| id          | INT UNSIGNED  | PRIMARY KEY, AUTO_INCREMENT                   | 文章唯一标识                                     |
| title       | VARCHAR(255)  | NOT NULL                                      | 文章标题                                         |
| content     | TEXT          | NOT NULL                                      | 正文内容，Markdown 格式存储                       |
| cover       | VARCHAR(255)  | DEFAULT NULL                                  | 封面图片 URL                                     |
| category_id | INT UNSIGNED  | DEFAULT NULL, FOREIGN KEY → categories(id)    | 所属分类，可为空（未分类）                        |
| tags        | JSON          | DEFAULT NULL                                  | 标签列表，示例: `["React", "Node.js"]`            |
| author_id   | INT UNSIGNED  | NOT NULL, FOREIGN KEY → users(id)             | 作者，逻辑删除用户时需要处理（见说明）             |
| views       | INT UNSIGNED  | NOT NULL, DEFAULT 0                           | 浏览次数                                         |
| created_at  | DATETIME      | NOT NULL, DEFAULT CURRENT_TIMESTAMP           | 创建时间                                         |
| updated_at  | DATETIME      | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 最后修改时间                     |

**外键与索引：**
- `FOREIGN KEY (author_id) REFERENCES users(id)`，防止出现孤儿文章。
- `FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL`，分类被删除时，相关文章的 `category_id` 自动置为 NULL，文章不会被删。
- 建议添加索引：`INDEX idx_author (author_id)`, `INDEX idx_category (category_id)`，提升按作者或分类查询的性能。
- 对于 `tags` JSON 字段，MySQL 可通过虚拟列创建索引来加速 JSON 内值查询，按需添加。

> **设计说明**：  
> - **为什么 `category_id` 而不是 `category` 字符串？**  
>   使用外键关联分类表，可以保证数据一致性，避免分类名变更时需要批量更新所有文章。前端显示时再通过 JOIN 拿到分类名。  
> - **为什么还要用 `tags` JSON 字段？**  
>   一篇文章通常只有少量标签，把标签以 JSON 数组形式存在文章行中，查询文章时一次就能拿到全部标签，无需多表连接，读取性能很高。同时，独立的 `tags` 表则用于标签管理和规范化。  
> - **`author_id` 关联策略：**  
>   如果后期需要删除用户，建议不要硬删除（`DELETE`），而是给 `users` 表添加一个 `is_active` 字段做逻辑删除。这样历史文章的作者信息不会丢失。

---

## 五、扩展预留（暂不建表）

随着系统迭代，可能会需要以下表，先留个印象：

- `comments`（评论）  
- `likes`（点赞 / 收藏）  
- `user_follows`（关注关系）  

目前专注于核心博客功能，这三张表（`users`、`categories`、`articles`）以及辅助的 `tags` 表已经足够完成基础 CRUD 与发布流程。

---

## 附：完整建表 SQL（MySQL 8.0+）

```sql
CREATE DATABASE IF NOT EXISTS blog_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE blog_dev;

CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 可选但推荐的标签规范表
CREATE TABLE tags (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE articles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    cover VARCHAR(255) DEFAULT NULL,
    category_id INT UNSIGNED DEFAULT NULL,
    tags JSON DEFAULT NULL,
    author_id INT UNSIGNED NOT NULL,
    views INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_author (author_id),
    INDEX idx_category (category_id),
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;