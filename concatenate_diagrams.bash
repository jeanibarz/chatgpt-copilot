#!/bin/bash

# Define the directory containing individual Mermaid diagram files and the output file
input_dir="./class_diagrams"
output_file="./combined_diagram.md"

# Initialize the output file with the opening Mermaid code block and classDiagram directive
echo '```mermaid' > "$output_file"
echo "classDiagram" >> "$output_file"

# Iterate through each .md file in the input directory
for file in "$input_dir"/*.md; do
  if [[ -f $file ]]; then
    echo "Processing $file..."

    # Use sed to:
    # - Remove lines starting with ```
    # - Remove lines containing classDiagram
    # - Keep all other lines (class definitions and relationships)
    sed '/```/d; /classDiagram/d' "$file" >> "$output_file"

    # Optionally, add a newline for separation between diagrams
    echo "" >> "$output_file"
  fi
done

# Close the Mermaid code block
echo '```' >> "$output_file"

echo "All diagrams have been successfully combined into $output_file as a single Mermaid diagram."
