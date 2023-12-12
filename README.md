# Strapi plugin Content-Versioning

This plugin lets you flip back and forth between different versions of your content, just as they were when you first created them.

## ⚠️✋ Read before installation

⚠️ Might not work with the [Strapi publisher plugin](https://market.strapi.io/plugins/strapi-plugin-publisher)  
⚠️ Might not work if `DATABASE_CLIENT` env variable is not set. More information [here](https://github.com/notum-cz/strapi-plugin-content-versioning/issues/113).    
⚠️ Does not work well with GraphQL ([more information](https://github.com/notum-cz/strapi-plugin-content-versioning/issues/152))

## 🙉 What does the plugin do for you?

✅ Provides the ability to switch between different content version as they were created.  
✅ Enables you to have **multiple draft versions** <br>
✅ Keeps a history of all changes, providing the ability to time travel (revert back to previous versions). <br>
✅ Gives you the ability to have  **different published and draft data** <br>

Data about all of the versions can be accessed by adding a parameter like `?populate=versions&publicationState=preview`

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


## 💾 Override the Save Button (🚨Deprecated since 1.0.1)

If you are using a version lower than 1.0.1 [patch-package](https://www.npmjs.com/package/patch-package) has to be used to make the native Save button work with this plugin. We are working closely with the core team to eliminate this extra step.

1. Install `patch-package`
   ```
   npm install patch-package
   ```
   ```
   yarn add patch-package
   ```
2. Create folder `patches` in the root of your project
3. Copy file `@strapi+admin+4.12.0.patch` located in  `patches/` of this repository to the folder created in the previous step
4. Add the line `"postinstall": "patch-package",` to the scripts section of the `package.json`
5. Run `npm run postinstall`

If a patch for your specific Strapi version is missing, please inform us or include it as a file in a pull request. Thank you!

## 🛣️ Road map

Are any of these features significant to you? Please show your support by giving a thumbs up on the linked issues. This will help us assess their priority on the roadmap.

- ✨ [Extension of functionality also for single types](https://github.com/notum-cz/strapi-plugin-content-versioning/issues/133)
- ✨ [Update of the current version without creating a new version](https://github.com/notum-cz/strapi-plugin-content-versioning/issues/134)

## ⛔️ Known limitations

- ✋  Not working with UID and unique fields

## 🐛 Bugs

We manage bugs through [GitHub Issues](https://github.com/notum-cz/strapi-plugin-content-versioning/issues). <br>
If you're interested in helping us, you would be a rock  ⭐.

## 🧔 Maintainance

The repository is maintained by [**Ondřej Mikulčík**]( https://github.com/omikulcik), a member of the Notum Technologies development team.

## 💬 Community

Join our [Discord server](https://discord.gg/hZRCcfWq) to discuss new features, implementation challenges or anything related to this plugin.  

## 🚀 Created with passion by [Notum Technologies](https://notum.cz/en)

- Official STRAPI partner and Czech based custom development agency.
- We're passionate about sharing our expertise with the open source community, which is why we developed this plugin. 🖤

## 🎯 [How can Notum help you with your STRAPI project?](https://notum.cz/en/strapi/)

✔️ We offer valuable assistance in developing custom STRAPI, web, and mobile apps to fulfill your requirements and goals.. <br>
✔️ With a track record of 100+ projects, our open communication and exceptional project management skills provide us with the necessary tools to get your project across the finish line.<br>
📅 To initiate a discussion about your Strapi project, feel free to reach out to us via email at sales@notum.cz. We're here to assist you!

# <br> Please contact us at sales@notum.cz

![](https://cdn-images-1.medium.com/max/1200/1*4KRSunIx8v3tcYHyxKSYXQ.jpeg)

Us helping you with this STRAPI plugin

## Keywords

- [strapi](https://www.npmjs.com/search?q=keywords:strapi)
- [plugin](https://www.npmjs.com/search?q=keywords:plugin)
- [version](https://www.npmjs.com/search?q=keywords:version)
