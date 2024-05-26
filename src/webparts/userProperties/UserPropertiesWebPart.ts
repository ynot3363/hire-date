import * as React from "react";
import * as ReactDom from "react-dom";
import { Version } from "@microsoft/sp-core-library";
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from "@microsoft/sp-property-pane";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";
import { IReadonlyTheme } from "@microsoft/sp-component-base";

import * as strings from "UserPropertiesWebPartStrings";
import UserProperties from "./components/UserProperties";
import { IUserPropertiesProps } from "./components/IUserPropertiesProps";
import { spfi, SPFx as spSPFx } from "@pnp/sp";
import "@pnp/sp/profiles";

export interface IUserPropertiesWebPartProps {
  description: string;
}

export default class UserPropertiesWebPart extends BaseClientSideWebPart<IUserPropertiesWebPartProps> {
  private _isDarkTheme: boolean = false;
  private _environmentMessage: string = "";
  private _hireDate: string = "";

  public render(): void {
    const element: React.ReactElement<IUserPropertiesProps> =
      React.createElement(UserProperties, {
        description: this.properties.description,
        isDarkTheme: this._isDarkTheme,
        environmentMessage: this._environmentMessage,
        hasTeamsContext: !!this.context.sdks.microsoftTeams,
        userDisplayName: this.context.pageContext.user.displayName,
        hireDate: this._hireDate,
      });

    ReactDom.render(element, this.domElement);
  }

  protected async onInit(): Promise<void> {
    await super.onInit();
    await this._getCurrentUserHireDate();

    return this._getEnvironmentMessage().then((message) => {
      this._environmentMessage = message;
    });
  }

  private async _getCurrentUserHireDate(): Promise<void> {
    const sp = spfi().using(spSPFx(this.context));

    const myProfile = await sp.profiles.myProperties();
    const userProfileProperties = myProfile.UserProfileProperties;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userProfileProperties.forEach((prop: { Key: string; Value: any }) => {
      if (prop.Key === "SPS-HireDate" && !!prop.Value) {
        this._hireDate = new Date(prop.Value).toLocaleDateString();
      }
    });

    return Promise.resolve();
  }

  private _getEnvironmentMessage(): Promise<string> {
    if (!!this.context.sdks.microsoftTeams) {
      // running in Teams, office.com or Outlook
      return this.context.sdks.microsoftTeams.teamsJs.app
        .getContext()
        .then((context) => {
          let environmentMessage: string = "";
          switch (context.app.host.name) {
            case "Office": // running in Office
              environmentMessage = this.context.isServedFromLocalhost
                ? strings.AppLocalEnvironmentOffice
                : strings.AppOfficeEnvironment;
              break;
            case "Outlook": // running in Outlook
              environmentMessage = this.context.isServedFromLocalhost
                ? strings.AppLocalEnvironmentOutlook
                : strings.AppOutlookEnvironment;
              break;
            case "Teams": // running in Teams
            case "TeamsModern":
              environmentMessage = this.context.isServedFromLocalhost
                ? strings.AppLocalEnvironmentTeams
                : strings.AppTeamsTabEnvironment;
              break;
            default:
              environmentMessage = strings.UnknownEnvironment;
          }

          return environmentMessage;
        });
    }

    return Promise.resolve(
      this.context.isServedFromLocalhost
        ? strings.AppLocalEnvironmentSharePoint
        : strings.AppSharePointEnvironment
    );
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const { semanticColors } = currentTheme;

    if (semanticColors) {
      this.domElement.style.setProperty(
        "--bodyText",
        semanticColors.bodyText || null
      );
      this.domElement.style.setProperty("--link", semanticColors.link || null);
      this.domElement.style.setProperty(
        "--linkHovered",
        semanticColors.linkHovered || null
      );
    }
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse("1.0");
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription,
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField("description", {
                  label: strings.DescriptionFieldLabel,
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
