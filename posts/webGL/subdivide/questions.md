### Part 4:

#### Question 1:

| Subdivision Level | # triangles | # vertices | # edges | Memory (MB) |
|:---:|:---:|:---:|:---:|:---:|
| s = 0 | 500  | 252  | 750  | .0105| 10,524
| s = 1 | 2000 | 1002 | 3000 | .0420| 42,024
| s = 2 | 8000 | 4002 | 12000| .168 | 168,024
| s = 3 | 32000|16002 | 48000| .672 | 672,024
| s = 4 |128000|64002 |192000| 2.69 | 2,688,024
| s = 5 |512000|256002|768000| 10.8 | 10,752,024

3*4bytes/vert + 3*4bytes/tri + 2*bytes/edge

#### Question 2:

According to the wiki page, maximum representable value for a 32-bit integer is
2^32 − 1 = 4,294,967,295.

If After 8 subdivistions, the number of triangles would have increased by 4^8 
times. So if the bunny model starts with 500 triangles, the after 8
subdivisions, there would be a total of 500 * 4^8 = 32,768,000 triangles.
After 16 subdivisions, there would be 2,147,483,648,000 triangles. If the
number of vertices approaches half the number of triangles, then after 8
subdivisions, it would fit within the limit, but not after 16. This is becase
2,147,483,648,000/2 > 4,294,967,295 which defines our limit.


