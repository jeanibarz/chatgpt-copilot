#!/usr/bin/env python3

import os
import re

# Define the directory containing individual Mermaid diagram files and the output file
input_dir = "./class_diagrams"
output_file = "./combined_diagram.md"

# Mapping of problematic characters to their HTML entity codes
char_map = {
    '{': '&#123;',
    '}': '&#125;',
}

# Create a regex pattern to match any of the problematic characters
pattern = re.compile('|'.join(re.escape(key) for key in char_map.keys()))

def replace_problematic_characters_in_signature(line: str) -> str:
    """
    Replaces problematic characters like { and } only within method signatures,
    leaving other parts of the line intact.

    Parameters:
        line (str): A single line from the Mermaid diagram.

    Returns:
        str: The line with problematic characters replaced within method signatures.
    """
    # Regex to match method signatures starting with + or -, possibly preceded by whitespace
    method_signature_match = re.match(r'^(\s*[-+]\w+\([^)]*\))(.*)', line)

    if method_signature_match:
        # Extract the method signature and the rest of the line
        method_signature, rest_of_line = method_signature_match.groups()

        # Replace problematic characters within the method signature
        replaced_signature = pattern.sub(lambda match: char_map.get(match.group(0), match.group(0)), method_signature)

        # Reconstruct the line with the replaced signature and the unchanged rest
        return replaced_signature + rest_of_line
    return line

def replace_dots_with_underscores(class_name: str) -> str:
    """
    Replaces dots in class names with underscores.

    Parameters:
        class_name (str): The original class name.

    Returns:
        str: The modified class name with dots replaced by underscores.
    """
    return class_name.replace('.', '_')

def ensure_classes_declared(output_lines: list) -> list:
    """
    Ensures that all classes referenced in relationships are declared.
    If a class is referenced but not declared, it is added as an empty class
    without curly braces and with dots replaced by underscores.

    Parameters:
        output_lines (list): The list of lines in the Mermaid diagram.

    Returns:
        list: The updated list of lines with missing class declarations added within the Mermaid code block.
    """
    declared_classes = set()
    referenced_classes = set()

    # Regex patterns
    # Capture class declarations with optional braces and any trailing characters
    class_declaration_pattern = re.compile(r'^(\s*class\s+)([\w\.]+)(\s*\{?[^}]*)')
    # Capture relationships between classes
    relationship_pattern = re.compile(r'^\s*([\w\.]+)\s*([<|-]+[->]+)\s*([\w\.]+)')

    # Processed lines
    processed_lines = []

    for line in output_lines:
        # Check for class declarations
        class_decl_match = class_declaration_pattern.match(line)
        if class_decl_match:
            prefix = class_decl_match.group(1)
            class_name = class_decl_match.group(2).strip()
            suffix = class_decl_match.group(3)
            class_name_underscored = replace_dots_with_underscores(class_name)
            declared_classes.add(class_name_underscored)

            # Reconstruct the line with underscores and preserve the rest (including braces)
            new_line = f"{prefix}{class_name_underscored}{suffix}"
            processed_lines.append(new_line)
            continue  # Move to the next line

        # Check for relationships
        relationship_match = relationship_pattern.match(line)
        if relationship_match:
            source_class = relationship_match.group(1).strip()
            relationship = relationship_match.group(2).strip()
            target_class = relationship_match.group(3).strip()

            # Replace dots with underscores
            source_class_underscored = replace_dots_with_underscores(source_class)
            target_class_underscored = replace_dots_with_underscores(target_class)

            # Add to referenced classes
            referenced_classes.add(source_class_underscored)
            referenced_classes.add(target_class_underscored)

            # Replace class names in the line
            leading_spaces_match = re.match(r'^(\s*)', line)
            leading_spaces = leading_spaces_match.group(1) if leading_spaces_match else ''
            new_line = f"{leading_spaces}{source_class_underscored} {relationship} {target_class_underscored}"
            processed_lines.append(new_line)
            continue  # Move to the next line

        # For all other lines, keep them as is
        processed_lines.append(line)

    # Identify missing classes
    missing_classes = referenced_classes - declared_classes

    if not missing_classes:
        return processed_lines  # No missing classes; return as is

    # Find the index of the closing '```' to insert before it
    closing_code_block_index = None
    for i in range(len(processed_lines) - 1, -1, -1):
        if processed_lines[i].strip() == '```':
            closing_code_block_index = i
            break

    if closing_code_block_index is None:
        # If no closing code block is found, append at the end
        processed_lines.append('')
        closing_code_block_index = len(processed_lines)

    # Prepare missing class declarations without curly braces and with underscores
    missing_class_declarations = [f'class {class_name}' for class_name in sorted(missing_classes)]

    # Insert a newline for separation if needed
    if closing_code_block_index > 0 and processed_lines[closing_code_block_index - 1].strip() != '':
        missing_class_declarations.insert(0, '')

    # Insert missing class declarations before the closing '```'
    processed_lines = (
        processed_lines[:closing_code_block_index] +
        missing_class_declarations +
        processed_lines[closing_code_block_index:]
    )

    return processed_lines

def concatenate_mermaid_diagrams_with_replacements(input_dir: str, output_file: str):
    """
    Concatenates all Mermaid diagram files (.md) in the input directory into a single output file,
    replaces problematic characters inside method definitions, replaces dots in class names with underscores,
    preserves curly braces in existing class declarations, and ensures all classes are declared.

    Parameters:
        input_dir (str): Directory containing individual Mermaid diagram files.
        output_file (str): Path to the output file where combined content will be saved.
    """
    # Initialize the output content
    output_lines = []
    output_lines.append('```mermaid')
    output_lines.append('classDiagram')

    # Iterate through each .md file in the input directory
    for filename in os.listdir(input_dir):
        if filename.endswith('.md'):
            file_path = os.path.join(input_dir, filename)
            print(f"Processing {file_path}...")

            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    # Skip lines starting with "```"
                    if line.strip().startswith('```'):
                        continue
                    # Skip lines containing 'classDiagram'
                    if 'classDiagram' in line:
                        continue

                    # Apply the replacement function to method signature lines
                    new_line = replace_problematic_characters_in_signature(line)
                    output_lines.append(new_line.rstrip())

            # Optionally, add a newline for separation between diagrams
            output_lines.append('')

    # Ensure all classes referenced in relationships are declared and process class names
    output_lines = ensure_classes_declared(output_lines)

    # Close the Mermaid code block
    output_lines.append('```')

    # Write the combined content to the output file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))

    print(f"All diagrams have been successfully combined into {output_file} as a single Mermaid diagram.")


# Function for generating test cases and validating the replacements and class declarations
def test_script_functions():
    """
    Tests the replace_problematic_characters_in_signature and ensure_classes_declared functions.
    """
    # Test replace_problematic_characters_in_signature
    def test_replace_problematic_characters_in_signature():
        test_cases = [
            # Test case 1: Method signature with problematic braces in parameters and leading spaces
            ("  +formatDocstrings(docstrings: { filePath: string; docstring: string; }[] | null | undefined): string",
             "  +formatDocstrings(docstrings: &#123; filePath: string; docstring: string; &#125;[] | null | undefined): string"),

            # Test case 2: Method with arrow function (no braces to replace)
            ("-handleConfigurationChange(e: vscode.ConfigurationChangeEvent, provider: ChatGptViewProvider, logger: CoreLogger, setContext: () => void)",
             "-handleConfigurationChange(e: vscode.ConfigurationChangeEvent, provider: ChatGptViewProvider, logger: CoreLogger, setContext: () => void)"),

            # Test case 3: Mermaid syntax without problematic characters
            ("classDiagram", "classDiagram"),

            # Test case 4: Class declaration (should remain untouched before processing)
            ("class MyClass {", "class MyClass {"),

            # Test case 5: Method signature with leading tabs
            ("\t+initialize(config: { url: string; port: number; }): void",
             "\t+initialize(config: &#123; url: string; port: number; &#125;): void"),

            # Test case 6: Method signature without leading spaces
            ("+compute(data: { key: string; value: any; }): number",
             "+compute(data: &#123; key: string; value: any; &#125;): number"),
        ]
        
        for i, (input_line, expected_output) in enumerate(test_cases, 1):
            result = replace_problematic_characters_in_signature(input_line)
            assert result == expected_output, f"Replacement Test case {i} failed: {result} != {expected_output}"
            print(f"Replacement Test case {i} passed.")

    # Test ensure_classes_declared
    def test_ensure_classes_declared():
        input_lines = [
            "```mermaid",
            "classDiagram",
            "    class ChatHistoryManager {",
            "        -chatHistory: CoreMessage[]",
            "        +addMessage(role: 'user' | 'assistant', content: string): void",
            "    }",
            "",
            "    Extension --> vscode.ExtensionContext",
            "    Extension --> FilteredTreeDataProvider",
            "",
            "```"
        ]

        expected_output = [
            "```mermaid",
            "classDiagram",
            "    class ChatHistoryManager {",
            "        -chatHistory: CoreMessage[]",
            "        +addMessage(role: 'user' | 'assistant', content: string): void",
            "    }",
            "",
            "    Extension --> vscode_ExtensionContext",
            "    Extension --> FilteredTreeDataProvider",
            "",
            "",
            "class Extension",
            "class FilteredTreeDataProvider",
            "class vscode_ExtensionContext",
            "```"
        ]

        result = ensure_classes_declared(input_lines)
        assert result == expected_output, f"Class Declaration Test failed:\n{result} != \n{expected_output}"
        print("Class Declaration Test passed.")

    # Run all tests
    test_replace_problematic_characters_in_signature()
    test_ensure_classes_declared()

# Run the tests to validate the implementation
if __name__ == "__main__":
    # Run the tests first
    # test_script_functions()

    # Then perform the concatenation
    concatenate_mermaid_diagrams_with_replacements(input_dir, output_file)
