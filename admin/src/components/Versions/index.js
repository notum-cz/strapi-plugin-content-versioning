import React, { useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import _ from "lodash";
import { useIntl } from "react-intl";
import { Box } from "@strapi/design-system/Box";
import { Stack } from "@strapi/design-system/Stack";
import { Divider } from "@strapi/design-system/Divider";
import { TableLabel } from "@strapi/design-system/Text";
import { Select, Option } from "@strapi/design-system/Select";
import { Typography } from "@strapi/design-system/Typography";
import { Flex } from "@strapi/design-system/Flex";
import {
  useCMEditViewDataManager,
  useNotification,
} from "@strapi/helper-plugin";
import { Button } from "@strapi/design-system/Button";
import Earth from "@strapi/icons/Earth";
import EarthStriked from "@strapi/icons/EarthStriked";

import { request } from "@strapi/helper-plugin";

import { getTrad } from "../../utils";

const Versions = () => {
  const { formatMessage } = useIntl();
  const { push, replace } = useHistory();
  const {
    initialData,
    modifiedData,
    isCreatingEntry,
    slug,
    hasDraftAndPublish,
    layout,
  } = useCMEditViewDataManager();
  const toggleNotification = useNotification();

  if (!_.get(layout, "pluginOptions.versions.versioned", false)) {
    return null;
  }

  const [data, setData] = useState([]);
  const [publishedVersion, setPublishedVersion] = useState(undefined);

  useEffect(() => {
    processVersions(modifiedData);
  }, [modifiedData]);

  const processVersions = useCallback(
    (data) => {
      const versions = (data.versions || []).map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        label: `v${v.versionNumber}`,
        publishedAt: v.publishedAt,
      }));
      const sortedVersions = versions.sort(
        (a, b) => b.versionNumber - a.versionNumber
      );
      setData(sortedVersions);

      if (hasDraftAndPublish) {
        const publishedVersions = versions.filter((v) => v.publishedAt);
        if (data.publishedAt) {
          publishedVersions.push({
            versionNumber: data.versionNumber,
            publishedAt: data.publishedAt,
          });
        }
        const publishedVersion = _.maxBy(
          publishedVersions,
          (v) => v.versionNumber
        );

        setPublishedVersion(publishedVersion && publishedVersion.versionNumber);
      }
    },
    [_, hasDraftAndPublish, setData, setPublishedVersion]
  );

  const handleChange = useCallback(
    (value) => {
      if (!value) {
        return;
      }

      const selectedVersion = data.find((v) => v.versionNumber === value);

      push({
        pathname: `/content-manager/collectionType/${slug}/${selectedVersion.id}`,
      });
    },
    [data, push, slug]
  );

  const onSaveClick = useCallback(async () => {
    const {
      createdAt,
      createdBy,
      publishedAt,
      updatedAt,
      updatedBy,
      id,
      ...newData
    } = modifiedData;

    try {
      const result = await request(`/versions/${slug}/save`, {
        method: "POST",
        body: newData,
      });

      replace({
        pathname: `/content-manager/collectionType/${slug}/${result.id}`,
      });
    } catch (e) {
      const name = _.get(e, "response.payload.error.name");
      const message = _.get(e, "response.payload.error.message");
      let notificationMessage = "Error";
      if (name && message) {
        notificationMessage = `${name}: ${message}`;
      }
      toggleNotification({
        type: "warning",
        message: notificationMessage,
      });
    }
  }, [modifiedData, push, request, slug]);

  return (
    <>
      {/* TODO add translation */}
      <Box marginTop={8}>
        <TableLabel textColor="neutral600">
          {formatMessage({
            id: getTrad("components.Edit.versions"),
            defaultMessage: "Versions",
          })}
        </TableLabel>
      </Box>
      <Box paddingTop={2} paddingBottom={6}>
        <Divider />
      </Box>
      <Stack size={4}>
        {publishedVersion && (
          <Flex justifyContent="space-between">
            <Typography fontWeight="bold">
              {formatMessage({
                id: getTrad("containers.Edit.currentPublishedVersion"),
                defaultMessage: "Published version",
              })}
            </Typography>
            <Typography>{`v${publishedVersion}`}</Typography>
          </Flex>
        )}
        <Flex justifyContent="space-between">
          <Typography fontWeight="bold">
            {formatMessage({
              id: getTrad("containers.Edit.currentShowedVersion"),
              defaultMessage: "Showed version",
            })}
          </Typography>
          <Typography>
            {isCreatingEntry ? "-" : `v${initialData.versionNumber}`}
          </Typography>
        </Flex>
        {data.length > 0 && (
          <Select
            name={"version-select"}
            placeholder={formatMessage({
              id: getTrad("components.Edit.versionSelectPlaceholder"),
              defaultMessage: "Select version",
            })}
            onChange={handleChange}
          >
            {data.map((option) => (
              <Option
                key={option.versionNumber}
                value={option.versionNumber}
                startIcon={option.publishedAt ? <Earth /> : <EarthStriked />}
              >
                {option.label}
              </Option>
            ))}
          </Select>
        )}
        {/* {!isCreatingEntry && (
          <Button variant="secondary">
            {formatMessage({
              id: getTrad("containers.Edit.buttonPreview"),
              defaultMessage: "Preview",
            })}
          </Button>
        )} */}
        <Button variant="default" onClick={onSaveClick}>
          {formatMessage({
            id: getTrad("containers.Edit.buttonSave"),
            defaultMessage: "Save as a new version",
          })}
        </Button>
      </Stack>
    </>
  );
};

export default Versions;
