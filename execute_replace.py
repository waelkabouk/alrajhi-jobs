file_path = 'c:/Users/waelk/OneDrive/Desktop/alrajhi-jobs/src/pages/JobDetails.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '<Card>\n              <CardHeader>\n                <CardTitle className="text-lg">{t("public.apply")}</CardTitle>\n              </CardHeader>\n              <CardContent>\n                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">'
end_marker = '                  </Button>\n                </form>\n              </CardContent>\n            </Card>'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1:
    print('Start marker not found')
elif end_idx == -1:
    print('End marker not found')
else:
    end_idx += len(end_marker)
    
    with open('replace_form.py', 'r', encoding='utf-8') as f:
        py_content = f.read()
    
    import re
    replacement_match = re.search(r'replacement = """(.*?)"""', py_content, re.DOTALL)
    if replacement_match:
        replacement = replacement_match.group(1)
        new_content = content[:start_idx] + replacement + content[end_idx:]
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Successfully sliced and replaced')
    else:
        print('Replacement string not found in replace_form.py')
