echo ========== COMPARE TO /Users/rseikel/code/SS19A-CWolf_orig/src
find . -name "*.js" -exec echo ./differs.sh {} /Users/rseikel/code/2020B_OToole/SOTOOLE_2020B/use_cases/ANU_MarzV2/src/{} \; > tmp_all_js.sh
chmod +x tmp_all_js.sh
./tmp_all_js.sh
