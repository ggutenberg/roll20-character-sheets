(function () {
  async function getRepeatingSectionArrayAsync(
    keynamesDefaultsObject,
    section,
    rowIds,
    attrNames
  ) {
    console.log(
      "getRepeatingSectionArrayAsync",
      keynamesDefaultsObject,
      section,
      rowIds,
      attrNames
    );
    let sectionArray = [];
    const attrs = await getAttrsAsync(attrNames);
    rowIds.forEach((rowId) => {
      const filteredAttributes = filterDefaults(
        keynamesDefaultsObject,
        attrs,
        `repeating_${section}_${rowId}_`
      );
      sectionArray.push(filteredAttributes);
    });
    return sectionArray;
  }

  function filterDefaults(keynamesDefaultsObject, attrs, prefix = "") {
    if (Array.isArray(keynamesDefaultsObject)) {
      keynamesDefaultsObject = keysDefaultsToKeynamesDefaults(
        keynamesDefaultsObject
      );
    }
    const filteredAttrs = Object.keys(attrs).reduce((acc, attr) => {
      const newAttrName = attr.replace(`${prefix}`, "");
      const defaultValue = keynamesDefaultsObject[newAttrName];
      const rawImportValue = attrs[attr];
      const attributeType = typeof defaultValue;
      switch (attributeType) {
        case "number":
          importValue = +rawImportValue;
          break;
        case "string":
          importValue = rawImportValue.toString();
          break;
      }
      if (defaultValue !== importValue) {
        acc[newAttrName] = importValue;
      }
      return acc;
    }, {});
    return filteredAttrs;
  }

  async function getRepeatingRowsAsync(keysDefaultsArray, section) {
    console.log("getRepeatingRowsAsync", keysDefaultsArray, section);
    const ids = await getSectionIDsOrderedAsync(section);
    const attrNames = ids.reduce((acc, id) => {
      SECTIONS[section].forEach((key) => {
        acc.push(`repeating_${section}_${id}_${key}`);
      });
      return acc;
    }, []);
    const repeatingSectionArray = await getRepeatingSectionArrayAsync(
      keysDefaultsToKeynamesDefaults(keysDefaultsArray),
      section,
      ids,
      attrNames
    );
    return repeatingSectionArray;
  }

  on("clicked:export", async (e) => {
    console.log("export", e);
    const attrs = {};
    attrs.h2h = await getRepeatingRowsAsync(KEYS_DEFAULTS.H2H, "h2h");
    attrs.wp = await getRepeatingRowsAsync(KEYS_DEFAULTS.WP.wp, "wp");
    attrs.wpmodern = await getRepeatingRowsAsync(
      KEYS_DEFAULTS.WP.wpmodern,
      "wpmodern"
    );
    attrs.skills = await getRepeatingRowsAsync(KEYS_DEFAULTS.SKILL, "skills");
    attrs.magic = await getRepeatingRowsAsync(KEYS_DEFAULTS.MAGIC, "magic");
    attrs.psionics = await getRepeatingRowsAsync(
      KEYS_DEFAULTS.PSIONICS,
      "psionics"
    );
    attrs.movement = await getRepeatingRowsAsync(
      KEYS_DEFAULTS.MOVEMENT,
      "movement"
    );
    attrs.powersabilities = await getRepeatingRowsAsync(
      KEYS_DEFAULTS.ABILITIES,
      "powersabilities"
    );
    attrs.modifiers = await getRepeatingRowsAsync(
      KEYS_DEFAULTS.MODIFIERS,
      "modifiers"
    );
    attrs.armor = await getRepeatingRowsAsync(KEYS_DEFAULTS.ARMOR, "armor");
    attrs.equipment = await getRepeatingRowsAsync(
      KEYS_DEFAULTS.EQUIPMENT,
      "equipment"
    );
    // Profiles are tricky to export because IDs that they refer to won't line up
    // attrs.profiles = await getRepeatingRowsAsync("profiles");

    const coreAttributes = await getAttrsAsync(CORE_KEYS);
    attrs.core = filterDefaults(KEYS_DEFAULTS.CORE, coreAttributes);
    await setAttrsAsync({ importexport: JSON.stringify(attrs, null, 2) });
  });

  async function setRepeatingRowsAsync(section, data) {
    await setAttrsAsync({ importexportstatus: `Importing ${section}...` });
    console.log("setRepeatingRows", section, data);
    if (!data) return;
    console.log("continuing setRepeatingRows", section);
    const attrs = data.reduce((acc, row) => {
      const rowId = generateRowID();
      Object.entries(row).forEach(([key, val]) => {
        if (parseInt(val) == 0) {
          return;
        }
        acc[`repeating_${section}_${rowId}_${key}`] = val;
      });
      return acc;
    }, {});
    attrs.importexportstatus = `Done importing ${section}...`;
    await setAttrsAsync(attrs);
  }

  function importAll(data) {
    let attrs = data.core || {};
    Object.keys(SECTIONS).forEach((section) => {
      if (!data[section]) {
        return;
      }
      console.log(section, data[section]);
      const sectionAttrs = data[section].reduce((acc, row) => {
        const rowId = generateRowID();
        Object.entries(row).forEach(([key, val]) => {
          acc[`repeating_${section}_${rowId}_${key}`] = val;
        });
        return acc;
      }, {});
      attrs = Object.assign(attrs, sectionAttrs);
    });
    setAttrs(attrs, {}, () => {
      setAttrs({ importexport: "Done" });
    });
  }

  /**
   * Imports an object, ignoring values that haven't changed from their defaults.
   *
   * @param {string} keysDefaultsProp The KEYS_DEFAULTS property to compare to.
   * @param {object} objectToImport An object of key/value pairs to import.
   * @param {string} prefix The row ID prefix.
   */
  function getSmartImportObject(
    keysDefaultsArray,
    objectToImport,
    prefix = ""
  ) {
    console.log("getSmartImportObject", keysDefaultsArray, objectToImport);
    if (!objectToImport) return {};
    const reducedImportObject = Object.entries(objectToImport).reduce(
      (acc, [importKey, rawImportValue]) => {
        const defaultValue = keysDefaultsArray.find(
          (obj) => obj.key === importKey
        ).default;
        const attributeType = typeof defaultValue;
        let importValue;
        switch (attributeType) {
          case "number":
            importValue = +rawImportValue;
            break;
          case "string":
            importValue = rawImportValue.toString();
            break;
        }
        if (defaultValue !== importValue) {
          console.log(importKey, defaultValue, importValue);
          acc[prefix + importKey] = importValue;
        }
        return acc;
      },
      {}
    );
    console.log("getSmartImportObject", reducedImportObject);
    return reducedImportObject;
  }

  async function smartImportArray(keysDefaultsArray, section, arrayOfObjects) {
    await setAttrsAsync({ importexportstatus: `Importing ${section}...` });
    console.log("smartImportArray", keysDefaultsArray, section, arrayOfObjects);
    if (!arrayOfObjects) return;
    const attrs = arrayOfObjects.reduce((acc, row) => {
      const rowId = generateRowID();
      const prefix = `repeating_${section}_${rowId}_`;
      const reducedRowImportObject = getSmartImportObject(
        keysDefaultsArray,
        row,
        prefix
      );
      acc = Object.assign(acc, reducedRowImportObject);
      return acc;
    }, {});
    attrs.importexportstatus = `Done importing ${section}...`;
    await setAttrsAsync(attrs);
  }

  on("clicked:import", async (e) => {
    console.log("import", e);
    await setAttrsAsync({ importexportstatus: "Importing core..." });
    const a = await getAttrsAsync(["importexport"]);
    const data = JSON.parse(a.importexport);
    console.log(data, KEYS_DEFAULTS.MODIFIERS);

    await smartImportArray(
      KEYS_DEFAULTS.MODIFIERS,
      "modifiers",
      data.modifiers
    );

    await setAttrsAsync(getSmartImportObject(KEYS_DEFAULTS.CORE, data.core));

    await smartImportArray(KEYS_DEFAULTS.H2H, "h2h", data.h2h);
    await smartImportArray(KEYS_DEFAULTS.SKILL, "skills", data.skills);
    await smartImportArray(KEYS_DEFAULTS.WP.wp, "wp", data.wp);
    await smartImportArray(
      KEYS_DEFAULTS.WP.wpmodern,
      "wpmodern",
      data.wpmodern
    );
    await smartImportArray(KEYS_DEFAULTS.MAGIC, "magic", data.magic);
    await smartImportArray(KEYS_DEFAULTS.PSIONICS, "psionics", data.psionics);
    await smartImportArray(
      KEYS_DEFAULTS.ABILITIES,
      "powersabilities",
      data.powersabilities
    );
    await smartImportArray(KEYS_DEFAULTS.MOVEMENT, "movement", data.movement);
    await smartImportArray(KEYS_DEFAULTS.ARMOR, "armor", data.armor);
    await smartImportArray(
      KEYS_DEFAULTS.EQUIPMENT,
      "equipment",
      data.equipment
    );

    await setAttrsAsync({
      importexportstatus:
        "Done importing, but triggered events are probably still running. To be sure open your browser console and when the logging stops, the import is really done.",
    });
  });
})();

on("sheet:opened", async (e) => {
  console.log("sheet:opened", e);
  await setAttrsAsync({ debug: "0" });
  // await migrateAttributes();
});

on("clicked:migrate", async (e) => {
  console.log("clicked:migrate", e);
  await migrateAttributes();
});

// $20("button.test").on("mouseenter", (e) => {
//   console.log(e);
// });

// on("clicked:test", async (e) => {
//   console.log("test");
//   const acid = getActiveCharacterId();
//   const attrs = findObjs({
//     _type: "attribute",
//     _characterid: acid,
//   });
//   console.log(acid, attrs);
// });
