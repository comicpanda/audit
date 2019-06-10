# audit

in order to update data, run a sql below
```SQL
select s.id, s.title, p.file_path as thum, p1.file_path as book from series s
inner join pile p on s.thumb_id = p.id 
inner join pile p1 on s.book_cover_id = p1.id
where s.type = 1
``` 

and then copy rows as JSON. 
Then replace `data` value with a new value