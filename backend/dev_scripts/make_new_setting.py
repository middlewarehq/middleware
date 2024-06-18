"""
This script can be used to generate code for a new setting.
"""

import re
from typing import List, Tuple

CONFIGURATION_SETTINGS_PATH = (
    "../analytics_server/mhq/store/models/settings/configuration_settings.py"
)
SETTING_UTIL_PATH = "../analytics_server/mhq/service/settings/setting_type_validator.py"
MODELS_PATH = "../analytics_server/mhq/service/settings/models.py"
DEFAULT_SETTINGS_DATA_PATH = (
    "../analytics_server/mhq/service/settings/default_settings_data.py"
)
SETTINGS_SERVICE_PATH = (
    "../analytics_server/mhq/service/settings/configuration_settings.py"
)
SETTINGS_RESOURCE_PATH = "../analytics_server/mhq/api/resources/settings_resource.py"


def get_fields() -> List[Tuple[str, str]]:
    fields = []
    print("Enter the fields for the new setting type (enter 'done' when finished):")
    while True:
        field_name = input("Field name: ")
        if field_name.lower() == "done":
            break
        field_type = input("Field type: ")
        fields.append((field_name, field_type))
    return fields


def generate_default_values(fields: List[Tuple[str, str]]):
    defaults = {}
    for name, type_ in fields:
        if type_ == "list":
            defaults[name] = []
        if type_ == "str":
            defaults[name] = ""
        else:
            defaults[name] = None
    return defaults


def convert_to_pascal_case(snake_str: str) -> str:
    components = snake_str.lower().split("_")
    return "".join(x.capitalize() for x in components)


def append_setting_suffix(setting_type: str) -> str:
    return (
        setting_type
        if setting_type.split("_")[-1] == "SETTING"
        else setting_type + "_SETTING"
    )


def get_class_name(setting_type: str) -> str:
    return convert_to_pascal_case(setting_type)


def add_to_setting_type_enum(setting_type):
    with open(CONFIGURATION_SETTINGS_PATH, "r") as file:
        content = file.read()

    enum_pattern = r"(?P<indent>\s*)# ADD NEW SETTING TYPE ENUM HERE\n"
    match = re.search(enum_pattern, content)
    if match:
        indent = match.group("indent")
        new_enum_entry = f'{indent}{setting_type.upper()} = "{setting_type.upper()}"\n'
        content = re.sub(enum_pattern, new_enum_entry + match.group(0), content)

        with open(CONFIGURATION_SETTINGS_PATH, "w") as file:
            file.write(content)


def extend_settings_type_validator(setting_type):
    with open(SETTING_UTIL_PATH, "r") as file:
        content = file.read()

    validator_pattern = r"(?P<indent>\s*)# ADD NEW VALIDATOR HERE\n"
    match = re.search(validator_pattern, content)
    if match:
        indent = match.group("indent")
        new_validator_entry = (
            f"{indent}if setting_type == SettingType.{setting_type.upper()}.value:\n"
        )
        new_validator_entry += (
            f"{indent}    return SettingType.{setting_type.upper()}\n"
        )
        content = re.sub(
            validator_pattern, new_validator_entry + match.group(0), content
        )

        with open(SETTING_UTIL_PATH, "w") as file:
            file.write(content)


def add_new_setting_class(setting_type, fields):
    class_name = get_class_name(setting_type)

    with open(MODELS_PATH, "r") as file:
        content = file.read()

    fields_str = "\n    ".join([f"{name}: {type_}" for name, type_ in fields])
    new_class_entry = f"""
@dataclass
class {class_name}(BaseSetting):
    {fields_str}
"""
    class_pattern = r"(?P<indent>\s*)# ADD NEW SETTING CLASS HERE\n"
    match = re.search(class_pattern, content)
    if match:
        indent = match.group("indent")
        content = re.sub(
            class_pattern,
            f"{indent}{new_class_entry.strip()}\n{match.group(0)}",
            content,
        )

        with open(MODELS_PATH, "w") as file:
            file.write(content)


def update_default_setting_data(setting_type, default_values):
    with open(DEFAULT_SETTINGS_DATA_PATH, "r") as file:
        content = file.read()

    default_pattern = r"(?P<indent>\s*)# ADD NEW DEFAULT SETTING HERE\n"
    match = re.search(default_pattern, content)
    if match:
        indent = match.group("indent")
        new_default_entry = (
            f"{indent}if setting_type == SettingType.{setting_type.upper()}:\n"
        )
        new_default_entry += f"{indent}    return {default_values}\n"
        content = re.sub(default_pattern, new_default_entry + match.group(0), content)

        with open(DEFAULT_SETTINGS_DATA_PATH, "w") as file:
            file.write(content)


def update_settings_service(setting_type, fields):
    class_name = get_class_name(setting_type)

    with open(SETTINGS_SERVICE_PATH, "r") as file:
        content = file.read()

    fields_str = ", ".join([f'{name}=data.get("{name}", None)' for name, _ in fields])
    adapt_data_func = f"""
    def _adapt_{setting_type.lower()}_setting_from_setting_data(self, data: Dict[str, any]):
        return {class_name}({fields_str})
"""
    adapt_json_func = f"""
    def _adapt_{setting_type.lower()}_setting_from_json(self, data: Dict[str, any]):
        return {class_name}({fields_str})
"""
    fields_dict_str = ", ".join(
        [f'"{name}": specific_setting.{name}' for name, _ in fields]
    )
    adapt_json_data_func = f"""
    def _adapt_{setting_type.lower()}_setting_json_data(self, specific_setting: {class_name}):
        return {{{fields_dict_str}}}
"""

    handle_from_db_func = f"""
        if setting_type == SettingType.{setting_type.upper()}:
            return self._adapt_{setting_type.lower()}_setting_from_setting_data(setting_data)
"""
    handle_from_json_func = f"""
        if setting_type == SettingType.{setting_type.upper()}:
            return self._adapt_{setting_type.lower()}_setting_from_json(setting_data)
"""
    handle_to_db_func = f"""
        if setting_type == SettingType.{setting_type.upper()} and isinstance(specific_setting, {class_name}):
            return self._adapt_{setting_type.lower()}_setting_json_data(specific_setting)
"""

    content = re.sub(
        r"(?P<indent>\s*)# ADD NEW DICT TO DATACLASS ADAPTERS HERE\n",
        lambda m: f"{m.group('indent')}{adapt_data_func.strip()}\n{m.group(0)}",
        content,
    )
    content = re.sub(
        r"(?P<indent>\s*)# ADD NEW DICT TO API ADAPTERS HERE\n",
        lambda m: f"{m.group('indent')}{adapt_json_func.strip()}\n{m.group(0)}",
        content,
    )
    content = re.sub(
        r"(?P<indent>\s*)# ADD NEW DATACLASS TO JSON DATA ADAPTERS HERE\n",
        lambda m: f"{m.group('indent')}{adapt_json_data_func.strip()}\n{m.group(0)}",
        content,
    )
    content = re.sub(
        r"(?P<indent>\s*)# ADD NEW HANDLE FROM DB SETTINGS HERE\n",
        lambda m: f"{m.group('indent')}{handle_from_db_func.strip()}\n{m.group(0)}",
        content,
    )
    content = re.sub(
        r"(?P<indent>\s*)# ADD NEW HANDLE FROM JSON DATA HERE\n",
        lambda m: f"{m.group('indent')}{handle_from_json_func.strip()}\n{m.group(0)}",
        content,
    )
    content = re.sub(
        r"(?P<indent>\s*)# ADD NEW HANDLE TO DB SETTINGS HERE\n",
        lambda m: f"{m.group('indent')}{handle_to_db_func.strip()}\n{m.group(0)}",
        content,
    )

    with open(SETTINGS_SERVICE_PATH, "w") as file:
        file.write(content)


def update_api_adapter(setting_type, fields):
    class_name = get_class_name(setting_type)

    with open(SETTINGS_RESOURCE_PATH, "r") as file:
        content = file.read()

    fields_str = ", ".join(
        [f'"{name}": config_settings.specific_settings.{name}' for name, _ in fields]
    )
    new_api_entry = f"""
        if isinstance(config_settings.specific_settings, {class_name}):
            response["setting"] = {{
                {fields_str}
            }}
"""
    api_pattern = r"(?P<indent>\s*)# ADD NEW API ADAPTER HERE\n"
    match = re.search(api_pattern, content)
    if match:
        indent = match.group("indent")
        content = re.sub(
            api_pattern, f"{indent}{new_api_entry.strip()}\n{match.group(0)}", content
        )

        with open(SETTINGS_RESOURCE_PATH, "w") as file:
            file.write(content)


def main():
    setting_type = input(
        "Enter the new setting type (e.g., EXCLUDED_TICKET_TYPES_SETTING): "
    )
    setting_type = append_setting_suffix(setting_type)

    fields: List[Tuple[str, str]] = get_fields()
    default_values = generate_default_values(fields)
    add_to_setting_type_enum(setting_type)
    extend_settings_type_validator(setting_type)
    add_new_setting_class(setting_type, fields)
    update_default_setting_data(setting_type, default_values)
    update_settings_service(setting_type, fields)
    update_api_adapter(setting_type, fields)

    print("-----Files Updated-----\n")

    print(CONFIGURATION_SETTINGS_PATH)
    print(SETTING_UTIL_PATH)
    print(MODELS_PATH)
    print(DEFAULT_SETTINGS_DATA_PATH)
    print(SETTINGS_SERVICE_PATH)
    print(SETTINGS_RESOURCE_PATH)

    print("-----------------------\n")

    print(f"Setting type {setting_type} added successfully.")
    print(f"Please fix imports in the updated files and set default settings.")


main()
