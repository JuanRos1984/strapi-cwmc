import type { Schema, Struct } from '@strapi/strapi';

export interface ServicesServiceCategory extends Struct.ComponentSchema {
  collectionName: 'components_services_service_categories';
  info: {
    displayName: 'ServiceCategory';
  };
  attributes: {
    categoryName: Schema.Attribute.String & Schema.Attribute.Required;
    services: Schema.Attribute.Component<'services.service-item', true> &
      Schema.Attribute.Required;
  };
}

export interface ServicesServiceItem extends Struct.ComponentSchema {
  collectionName: 'components_services_service_items';
  info: {
    displayName: 'ServiceItem';
  };
  attributes: {
    description: Schema.Attribute.Blocks & Schema.Attribute.Required;
    icon: Schema.Attribute.String;
    name: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'services.service-category': ServicesServiceCategory;
      'services.service-item': ServicesServiceItem;
    }
  }
}
