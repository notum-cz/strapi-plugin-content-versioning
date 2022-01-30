# Strapi Version Plugin

This plugin enables versioning of Content Type in Strapi. Also it enables to select published version, so you can have multiple draft version.

Versioning can be enabled in settings of Content Type. Same as localziation plugin.

## Installation

Simply run `npm i @notum-cz/strapi-plugin-content-versioning` or `yarn add @notum-cz/strapi-plugin-content-versioning`



## Overriding `save` button (not necessary but recommended)

You have to use [patch-package](https://www.npmjs.com/package/patch-package) to make it work with native Save button. (We are working closely to change this with Strapi team).

1. Install `patch-package`
   - `npm install patch-package` or `yarn add patch-package`
2. Create folder `patches` in root of your project
3. Add file `@strapi+plugin-sentry+4.0.0.patch` with content below

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

## Will be added
 - [] history for single types
 - [] remove patch-package problem
 - [] autosave
 - [] update current version (without creating new one)

## Know limitation
- Not working with UID and unique fields


## Bugs
We are using GitHub Issues to manage our public bugs. We keep a close eye on this so before filing a new issue, try to make sure the problem does not already exist.
