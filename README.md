# Strapi Plugin-Content-Versioning

**⚠️⚠️⚠️**: i18n currently in **beta** stage.

**⚠️⚠️⚠️**: Currently a **beta.** <br> We are using it in production (but still working on it ☀️🌙).


### A Strapi plugin for managing versions of your content.

This plugin provides the ability to switch between different content version as they were created.

### Benefits

✅ Have **multiple draft versions** <br>
✅ Keeping a **history of all changes (with time travel)** <br>
✅ Allows you to have **different published and draft data** <br>

## 🧑‍💻 Install

```
npm i @notum-cz/strapi-plugin-content-versioning
yarn add @notum-cz/strapi-plugin-content-versioning
```

## 🖐⚠️ Read before installation

1. **Versioning** must be **enabled in settings of Content Type**. _Same as localization plugin._
2. You need to have **enabled draft/publish** system on your **content type.**
3. Roles that are going to use the plugin need to have permission enabled in the Settings > Roles > ... > Plugins view.
4. You need to create/modify file `config/plugins.js` with

```
module.exports = ({ env }) => ({
	"content-versioning": {
		enabled:  true,
	},
});
```

5. (Optional) If you want to override also the Save button to work with this plugin you need to follow the instructions below. ⬇️⬇️

## 💾 Override Save Button (Optional)

You have to use [patch-package](https://www.npmjs.com/package/patch-package) to make it work with native Save button. _(We are working closely with the core team to change this)._

1. Install `patch-package`
   - `npm install patch-package` or `yarn add patch-package`
2. Create folder `patches` in root of your project
3. Add file `@strapi+admin+4.1.12.patch` with content localed in this repository `patches/` ⬇️
4. Add the line `"postinstall": "patch-package",` to the scripts section of the `package.json`
5. Run `npm run postinstall`

If patch for your strapi version is missing, please let me know or add it as file in pull request. Thanks!

# <br> <br> ⚠️⚠️⚠️ Open call for help for an awesome plugin.

## <br> History

We felt this is an important feature that did not seem so complex.

Therefore we rolled up our sleeves and got to work on it. We came up with **alpha quite fast** and were one the first ones to publish plugins in the new marketplace.

## <br> The current state of the plugin

<br> But then came the **early adopters** with more and **more complex data** structures and specific use cases that made our heads hurt.<br> <br>

> We called in our top brains and made more improvements, things were still going great….

# <br> BUT

**BUT then we landed 2 amazing and very important projects.**

Our focus went elsewhere and we left the plugin for some time without open-source love.

# <br> **Open call for help and** **a bit of warning:**

This plugin is **really nice challenge for a senior developer** to really code and have some fun.

<br> Our senior developer Martin, the main author, is also available to answer your questions.

<br> Issues are coming and people are using it: take a look here [https://github.com/notum-cz/strapi-plugin-content-versioning/issues](https://github.com/notum-cz/strapi-plugin-content-versioning/issues)

<br> This could be you. Making this plugin great again.

# <br> <br> The future and possibilities

We believe this plugin may be in the marketplace’s top 5 most used plugins. But for that to become a reality we need fellow developers that would help and take it to the place it deserves to be.<br><br>

**_“Therefore this is an open call to all the companies as well as solo developers to help us with this plugin.“_**

We will happily do PRs and answer your questions.

# <br> Please contact us at sales@notum.cz

![](https://cdn-images-1.medium.com/max/1200/1*4KRSunIx8v3tcYHyxKSYXQ.jpeg)

Us helping you with this STRAPI plugin

<br> <br> <hr> <br>

## 🛣️ Road map

- ✨ Fix of the "patch-package problem"
- ✨ Extension of functionality also for single types
- ✨ Autosave
- ✨ Update of the current version without creating new history item

## Know limitation

- ✋ ⛔️ Not working with UID and unique fields
- ✋ ⛔️ Not working with relations

## 🐛 Bugs

We are using [GitHub Issues](https://github.com/notum-cz/strapi-plugin-content-versioning/issues) to manage bugs. <br>
If you want to help us you would be a rock ⭐.

## 🧔 Authors

The main star: **Martin Čapek** https://github.com/martincapek <br>
Tech problem solver: **Tomáš Novotný** <br>
Project owner: **Ondřej Janošík** <br>

#### 🚀 Created with passion by [Notum Technologies](https://notum.cz/en)

- Official STRAPI partner and Czech based custom development agency.
- We love to share expertise with the open source community, that's why this plugin was created. 🖤

### 🎯 [How can Notum help you with your STRAPI project?](https://notum.cz/en/strapi/)

✔️ We can help you develop custom STRAPI, web and mobile apps. <br>
✔️ With 100+ projects, open communication and great project management we have the tools to get your project across the finish line.<br>
📅 If you want to discuss your Strapi project, text us at sales@notum.cz

## Keywords

- [strapi](https://www.npmjs.com/search?q=keywords:strapi)
- [plugin](https://www.npmjs.com/search?q=keywords:plugin)
- [version](https://www.npmjs.com/search?q=keywords:version)
