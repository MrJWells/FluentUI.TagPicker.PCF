# FluentUI.TagPicker.PCF ![GitHub all releases](https://img.shields.io/github/downloads/drivardxrm/FluentUI.TagPicker.PCF/total?style=plastic)

PowerApps Component framework (PCF) Control that renders a **Tag Picker** out of a many-to-many (N:N) subgrid in a Dataverse Model-driven form. 

**Out-of-the-box N:N subgrid**

![image](https://github.com/user-attachments/assets/3fdae5ba-dd87-458b-8b10-57e6cab16134)

**With FluentUI Tag Picker PCF**

![image](https://github.com/user-attachments/assets/af3aa23d-c84b-4317-93e6-f8d7b545b7b1)

:point_right:[Download Here](https://github.com/drivardxrm/FluentUI.TagPicker.PCF/releases/latest)

The control uses [FluentUI v9](https://react.fluentui.dev/?path=/docs/components-tagpicker--default) Tag picker control from the Fluent2 design system.

# Features:
- Exposes records from the subgrids 'Default view' 
- Supports individual record images
- Filter values based on input text
- Dark-mode aware


# Parameters
| Parameter         | Description                                                                                  | Default     |
|-------------------|----------------------------------------------------------------------------------------------|----------   |
| Tags Dataset  | Dataset to Expose |       Should be a N:N relationship subgrid      |
| Show Record Image  | Show the record image beside the text. |             |
| Parent Filter Value | Value from another form field used to filter suggestions (for example Error Category id). Supports a single value or multiple values serialized as comma-separated, semicolon-separated, or JSON array text. Leave empty to disable dependent filtering. | |
| Parent Filter Attribute | Logical name of the related table attribute to compare with **Parent Filter Value** values (for example `new_errorcategoryid`). Leave empty to disable dependent filtering. | |

![image](https://github.com/user-attachments/assets/1e6cd9cf-4a77-4229-a49a-5c375202b771)


# Screenshots

**Filtering**

![image](https://github.com/user-attachments/assets/c08e6463-436f-4209-8f34-c31cf48893de) 

![image](https://github.com/user-attachments/assets/5712ca53-3967-4066-b82b-055af9ec0042)


**Dark mode**

![image](https://github.com/user-attachments/assets/9d45fdb3-a65b-4233-81a2-eafda6ef26c7)


**Control in action**

![Recording 2024-08-04 174220](https://github.com/user-attachments/assets/d99e1aeb-96c9-4f07-b3f1-b6da31eccbb6)

## Dependent filtering setup

To configure parent-child filtering (for example **Error Category -> Sub Error Category**):

1. Bind **Parent Filter Value** to the parent field value from the form.
2. Set **Parent Filter Attribute** to the child table attribute logical name that stores the parent reference.

Behavior:
- If both parameters are not configured, the control keeps existing behavior.
- If **Parent Filter Attribute** is set but **Parent Filter Value** is empty, suggestions are hidden and the picker is disabled until a parent is selected.
- **Parent Filter Value** accepts a single value or multiple values. Supported formats include a single GUID/string, comma-separated values, semicolon-separated values, JSON array strings, and values wrapped in braces.
- Single parent values continue to use the existing one-to-one filter behavior.
- Multiple parent values are combined so matching child records from any supplied parent value are available in the picker.
- When parent value(s) change, suggestions refresh and selected tags that no longer match are removed.

## Build Power Apps solution ZIP artifact (GitHub Actions)

Use the workflow **Build Power Apps Solution ZIP**:

1. Go to **Actions** in GitHub.
2. Run **Build Power Apps Solution ZIP** (workflow_dispatch).
3. Open the workflow run and download the **powerapps-solution-zip** artifact.

The artifact includes importable Dataverse solution ZIP package(s) generated from `Solution/Solution.cdsproj` (unmanaged and managed when available).

## Manual validation checklist

No automated test project is included in this repository. Validate changes manually:

1. Build control (`npm run build`) and import generated solution ZIP.
2. Configure **Parent Filter Attribute** and bind **Parent Filter Value** on a model-driven form.
3. Confirm picker is disabled until the bound parent field has at least one value.
4. Confirm suggestions are filtered to matching child records for a single parent value.
5. Confirm comma-separated, semicolon-separated, or JSON-array parent values expose the combined matching child records.
6. Change parent value(s) and confirm non-matching selected tags are removed.
