// @ts-nocheck — migration TS, typage progressif
"use strict";

/**
 * GeoLeaf Content Builder - CSS Classes
 * Bibliotheque de classes CSS standards utilisees par tous les template builders.
 *
 * @module ui/content-builder/templates-css-classes
 */

const CSS_CLASSES = {
    // Container classes
    text: "gl-content__text",
    longtext: "gl-content__longtext",
    number: "gl-content__number",
    metric: "gl-content__metric",
    badge: "gl-poi-badge",
    rating: "gl-content__rating",
    image: "gl-content__image",
    link: "gl-content__link",
    list: "gl-content__list",
    table: "gl-content__table",
    tags: "gl-content__tags",
    tag: "gl-content__tag",
    coordinates: "gl-content__coordinates",
    gallery: "gl-content__gallery",

    // Badge variants
    badgeDefault: "gl-poi-badge--default",
    badgeStatus: "gl-poi-badge--status",
    badgePriority: "gl-poi-badge--priority",
    badgeCategory: "gl-poi-badge--category",

    // Rating
    star: "gl-star",
    starFull: "gl-star--full",
    starHalf: "gl-star--half",
    starEmpty: "gl-star--empty",
};

export { CSS_CLASSES };
