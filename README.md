# Strapi Plugin-Content-Versioning

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

<details>
  <summary>Click to see details ➕</summary>

You have to use [patch-package](https://www.npmjs.com/package/patch-package) to make it work with native Save button. _(We are working closely with the core team to change this)._

1. Install `patch-package`
   - `npm install patch-package` or `yarn add patch-package`
2. Create folder `patches` in root of your project
3. Add file `@strapi+admin+4.0.2.patch` with content below ⬇️
4. Add the line `"postinstall": "patch-package",` to the scripts section of the `package.json`
5. Run `npm run postinstall`

```
diff --git a/node_modules/@strapi/admin/admin/src/content-manager/components/CollectionTypeFormWrapper/index.js b/node_modules/@strapi/admin/admin/src/content-manager/components/CollectionTypeFormWrapper/index.js
index 6701309..393f616 100644
--- a/node_modules/@strapi/admin/admin/src/content-manager/components/CollectionTypeFormWrapper/index.js
+++ b/node_modules/@strapi/admin/admin/src/content-manager/components/CollectionTypeFormWrapper/index.js
@@ -247,9 +247,17 @@ const CollectionTypeFormWrapper = ({ allLayoutData, children, slug, id, origin }
     replace(redirectionLink);
   }, [redirectionLink, replace]);

+
+  const currentContentTypeLayout = get(allLayoutData, ['contentType'], {});
+
+  const hasVersions = useMemo(() => {
+    return get(currentContentTypeLayout, ['pluginOptions', 'versions', 'versioned'], false);
+  }, [currentContentTypeLayout]);
+
+
   const onPost = useCallback(
     async (body, trackerProperty) => {
-      const endPoint = `${getRequestUrl(`collection-types/${slug}`)}${rawQuery}`;
+      const endPoint = hasVersions ?  `/content-versioning/${slug}/save` : `${getRequestUrl(`collection-types/${slug}`)}${rawQuery}`;

       try {
         // Show a loading button in the EditView/Header.js && lock the app => no navigation
@@ -267,7 +275,13 @@ const CollectionTypeFormWrapper = ({ allLayoutData, children, slug, id, origin }
         // Enable navigation and remove loaders
         dispatch(setStatus('resolved'));

-        replace(`/content-manager/collectionType/${slug}/${data.id}${rawQuery}`);
+        if (hasVersions) {
+          replace({
+            pathname: `/content-manager/collectionType/${slug}/${data.id}`,
+          });
+        } else {
+          replace(`/content-manager/collectionType/${slug}/${data.id}${rawQuery}`);
+        }
       } catch (err) {
         trackUsageRef.current('didNotCreateEntry', { error: err, trackerProperty });
         displayErrors(err);
@@ -303,14 +317,15 @@ const CollectionTypeFormWrapper = ({ allLayoutData, children, slug, id, origin }

   const onPut = useCallback(
     async (body, trackerProperty) => {
-      const endPoint = getRequestUrl(`collection-types/${slug}/${id}`);
+
+      const endPoint = hasVersions ?  `/content-versioning/${slug}/save` : getRequestUrl(`collection-types/${slug}/${id}`);

       try {
         trackUsageRef.current('willEditEntry', trackerProperty);

         dispatch(setStatus('submit-pending'));

-        const { data } = await axiosInstance.put(endPoint, body);
+        const { data } = hasVersions ? await axiosInstance.post(endPoint, body) : await axiosInstance.put(endPoint, body);

         trackUsageRef.current('didEditEntry', { trackerProperty });
         toggleNotification({
@@ -321,6 +336,12 @@ const CollectionTypeFormWrapper = ({ allLayoutData, children, slug, id, origin }
         dispatch(submitSucceeded(cleanReceivedData(data)));

         dispatch(setStatus('resolved'));
+
+        if (hasVersions) {
+          replace({
+            pathname: `/content-manager/collectionType/${slug}/${data.id}`,
+          });
+        }
       } catch (err) {
         trackUsageRef.current('didNotEditEntry', { error: err, trackerProperty });
         displayErrors(err);
diff --git a/node_modules/@strapi/admin/admin/src/content-manager/components/EditViewDataManagerProvider/index.js b/node_modules/@strapi/admin/admin/src/content-manager/components/EditViewDataManagerProvider/index.js
index aff6f07..c5d7b87 100644
--- a/node_modules/@strapi/admin/admin/src/content-manager/components/EditViewDataManagerProvider/index.js
+++ b/node_modules/@strapi/admin/admin/src/content-manager/components/EditViewDataManagerProvider/index.js
@@ -49,6 +49,10 @@ const EditViewDataManagerProvider = ({
     return get(currentContentTypeLayout, ['options', 'draftAndPublish'], false);
   }, [currentContentTypeLayout]);

+  const hasVersions = useMemo(() => {
+    return get(currentContentTypeLayout, ['pluginOptions', 'versions', 'versioned'], false);
+  }, [currentContentTypeLayout]);
+
   const shouldNotRunValidations = useMemo(() => {
     return hasDraftAndPublish && !initialData.publishedAt;
   }, [hasDraftAndPublish, initialData.publishedAt]);
@@ -515,7 +519,7 @@ const EditViewDataManagerProvider = ({
         ) : (
           <>
             <Prompt
-              when={!isEqual(modifiedData, initialData)}
+              when={!hasVersions && !isEqual(modifiedData, initialData)}
               message={formatMessage({ id: 'global.prompt.unsaved' })}
             />
             <form noValidate onSubmit={handleSubmit}>
```

</details>

## 🛣️ Road map

- ✨ Fix of the "patch-package problem"
- ✨ Extension of functionality also for single types
- ✨ Autosave
- ✨ Update of the current version without creating new history item

## Know limitation

- ✋ ⛔️ Not working with UID and unique fields
- ✋ ⛔️ Not have i18n support 
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
📅 If you want to discuss your Strapi project with our CEO, book a meeting [Book a free 15min Calendly ](https://bit.ly/3thyPFX)

## Keywords

- [strapi](https://www.npmjs.com/search?q=keywords:strapi)
- [plugin](https://www.npmjs.com/search?q=keywords:plugin)
- [version](https://www.npmjs.com/search?q=keywords:version)
