#!/bin/bash
diff -w $1 $2 > ./tmp.tmp
if [ -s ./tmp.tmp ]
then
   echo diff $1 $2
   rm -f tmp.tmp
else
   rm -f tmp.tmp
fi
