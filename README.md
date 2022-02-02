# Strapi Plugin-Content-Versioning

**Disclaimer!!**: This plugin is an early alpha version mainly used for internal testing before a proper release. We do not encourage you to use it in production (but we are working heavily so this could change in near future).

This plugin enables you to versioning Content Types in Strapi v4! 🎉🎉🎉
* Heaving multiple draft versions✅
* Keeping a history of all changes (with time travel) ✅
* Allowing you to have different published and draft data ✅

# Instalation

Run `npm i @notum-cz/strapi-plugin-content-versioning`
or use `yarn add @notum-cz/strapi-plugin-content-versioning`


# Important - read before instalation

1. Versioning can be **enabled in settings of Content Type**. _Same as localziation plugin._
2. You need to have **enabled draft/publish** system on your content type.
3. You need to create/modify file `config/plugins.js` with
```
module.exports = ({ env }) => ({
	"content-versioning": {
		enabled:  true,
	},
});
```

4. (Optional) If you want to override also the Save button to work with this plugin you need to follow the instructions below. ⬇️⬇️

## Override Save Button (Optional)

You have to use [patch-package](https://www.npmjs.com/package/patch-package) to make it work with native Save button. _(We are working closely with tthe core team to change this)._


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

## Road map

- ✨ Fix of the "patch-package problem"
- ✨ Extension of functionality also for for single types
- ✨ Autosave
- ✨ Update of the current version without creating new history item

## Know limitation

- ✋ ⛔️ Not working with UID and unique fields

## Bugs

We are using [GitHub Issues](https://github.com/notum-cz/strapi-plugin-content-versioning/issues) to manage bugs. Please have a look at existing issues before creating a new one.

## Authors

![Martin Capek](https://notum.cz/wp-content/uploads/2022/02/stazeny-soubor-20.png)
The main star: Martin Čapek https://github.com/martincapek

![Tomas Novotny](https://notum.cz/wp-content/uploads/2022/02/stazeny-soubor-10.png)
Tech problem solver: Tomáš Novotný

![Ondrej Janosik](https://notum.cz/wp-content/uploads/2022/02/stazeny-soubor-2.png)
Project owner: Ondřej Janošík

Happily created by [Notum Technologies](https://notum.cz/en) - official STRAPI partner and Czech based custom development agency - to share some of our Strapi expertise with the broader open source community.

## Keywords

- [strapi](https://www.npmjs.com/search?q=keywords:strapi)
- [plugin](https://www.npmjs.com/search?q=keywords:plugin)
- [version](https://www.npmjs.com/search?q=keywords:version)
