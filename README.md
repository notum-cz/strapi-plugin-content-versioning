# Strapi plugin Content-Versioning

This plugin lets you flip back and forth between different versions of your content, just as they were when you first created them.

## ⚠️✋ Read before installation

⚠️ i18n currently in **beta** stage.  
⚠️ Currently a **beta.**   
⚠️ [Open call for developers](#history)

We're actively using this plugin in production, but we're still tweaking and improving it.


## 🙉 What does the plugin do for you?

✅ Provides the ability to switch between different content version as they were created.  
✅ Enables you to have **multiple draft versions** <br>
✅ Keeps a history of all changes, providing the ability to time travel (revert back to previous versions). <br>
✅ Gives you the ability to have  **different published and draft data** <br>

## 🧑‍💻 Installation

1. Install the package with your preferred package manager using one of the commands bellow:

```
npm i @notum-cz/strapi-plugin-content-versioning
```
```
yarn add @notum-cz/strapi-plugin-content-versioning
```
2. Create or modify file `config/plugins.js` and include the following code snippet:

```
module.exports = ({ env }) => ({
	"content-versioning": {
		enabled:  true,
	},
});
```

3. **Enabled versioning in the settings of your Content Type (Content-Type Builder -> Edit -> Advanced settings)**. _Same way as localization plugin._
2. Check if the **draft/publish** system is enabled on your **content type.** This is **required** for the plugin to work.
3. Roles which should use the plugin must have the appropriate permissions activated, which can be done in Settings > Roles > ... > Plugins view.
5. (Optional) If you want the native Save button to also work with this plugin, you'll need to follow the instructions below. ⬇️⬇️


## 💾 Override the Save Button (Optional)

[Patch-package](https://www.npmjs.com/package/patch-package) has to be used to make the native Save button work with this plugin. We are working closely with the core team to eliminate this extra step.

1. Install `patch-package`
   ```
   npm install patch-package
   ```
   ```
   yarn add patch-package
   ```
2. Create folder `patches` in the root of your project
3. Copy file `@strapi+admin+4.11.3.patch` located in  `patches/` of this repository to the folder created in the previous step
4. Add the line `"postinstall": "patch-package",` to the scripts section of the `package.json`
5. Run `npm run postinstall`

If a patch for your specific Strapi version is missing, please inform us or include it as a file in a pull request. Thank you!

## 🛣️ Road map

- ✨ Elimination of the "patch-package problem"
- ✨ Extension of functionality also for single types
- ✨ Autosave
- ✨ Update of the current version without creating new history item

## ⛔️ Known limitations

- ✋  Not working with UID and unique fields

## 🐛 Bugs

We manage bugs through [GitHub Issues](https://github.com/notum-cz/strapi-plugin-content-versioning/issues). <br>
If you're interested in helping us, you would be a rock  ⭐.

## 🧔 Authors

The main star: **Filip Janko** <br>
Tech problem solver #1: **Martin Čapek** https://github.com/martincapek <br>
Tech problem solver #2: **Tomáš Novotný** <br>
Maintainer: **Ondřej Mikulčík** https://github.com/omikulcik <br>
Project owner: **Ondřej Janošík** <br>

## 🚀 Created with passion by [Notum Technologies](https://notum.cz/en)

- Official STRAPI partner and Czech based custom development agency.
- We're passionate about sharing our expertise with the open source community, which is why we developed this plugin. 🖤

## 🎯 [How can Notum help you with your STRAPI project?](https://notum.cz/en/strapi/)

✔️ We offer valuable assistance in developing custom STRAPI, web, and mobile apps to fulfill your requirements and goals.. <br>
✔️ With a track record of 100+ projects, our open communication and exceptional project management skills provide us with the necessary tools to get your project across the finish line.<br>
📅 To initiate a discussion about your Strapi project, feel free to reach out to us via email at sales@notum.cz. We're here to assist you!

# <br> 📣👨‍💻👩‍💻 Open call for help for an awesome plugin
## History

We believed this was a **key feature** that didn't appear too complex.

Therefore, we rolled up our sleeves and got to work on it. We **quickly developed an alpha version** and were among the first to release plugins in the new marketplace.

However, the arrival of **early adopters**, with **increasingly complex data structures** and unique use cases, gave us quite the brain-teaser.

We called in our top brains and made further enhancements. Things were still going smoothly, but **after securing two amazing and highly important projects, our attention shifted**. Unfortunately, this meant leaving the plugin without the open-source love it deserved for some time.

## <br /> Open call for help and a little bit of heads-up

This plugin presents an enticing opportunity for a senior developer to delve into coding and have an enjoyable experience.

Our senior developer Martin, the main author, is also available to answer your questions.

Issues are emerging as people actively use the plugin. Just take a look - [https://github.com/notum-cz/strapi-plugin-content-versioning/issues](https://github.com/notum-cz/strapi-plugin-content-versioning/issues)

<br> It could be **you** who makes this plugin great again!

## <br /> The future and possibilities

We strongly believe that this plugin has the potential to become one of the top 5 most widely used plugins in the marketplace. However, to turn this vision into reality, we need the support of fellow developers who can help us take it to the place it deserves to be.

**Therefore, we extend an open call to all companies and solo developers to help us developing this plugin.**

We are more than willing to accept and review pull requests (PRs) and address any questions you may have.

# <br> Please contact us at sales@notum.cz

![](https://cdn-images-1.medium.com/max/1200/1*4KRSunIx8v3tcYHyxKSYXQ.jpeg)

Us helping you with this STRAPI plugin

## Keywords

- [strapi](https://www.npmjs.com/search?q=keywords:strapi)
- [plugin](https://www.npmjs.com/search?q=keywords:plugin)
- [version](https://www.npmjs.com/search?q=keywords:version)
