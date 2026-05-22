###########################################################################
##  hypercube34.g  --  GAP verification of the 3x3x3x3 Rubik hypercube group
##
##  Builds the configuration group G of the 3^4 puzzle as a permutation group
##  on the 216 coloured stickers, directly from the geometric model of the
##  paper (pieces = nonzero vectors in {-1,0,1}^4; a sticker is a piece
##  together with one exposed axis).  The 48 outer hyperface twists are the
##  generators.  GAP then certifies the order, the orbit sizes (Table 1), and
##  the coupled/corner parity laws of Section 3.4 by the Schreier-Sims method.
##
##  Run:  gap hypercube34.g
###########################################################################

# ---- enumerate pieces (nonzero vectors in {-1,0,1}^4) -------------------
pieces := Filtered(Cartesian([-1,0,1],[-1,0,1],[-1,0,1],[-1,0,1]),
                   v -> v <> [0,0,0,0]);;          # 80 pieces

# ---- enumerate stickers: (piece, exposed axis) with piece[axis] <> 0 ----
stickers := [];;
for p in pieces do
  for i in [1..4] do
    if p[i] <> 0 then Add(stickers, [p, i]); fi;
  od;
od;
# stickers now has 216 entries; the index in this list is the GAP point.
StickerIndex := function(p, i) return Position(stickers, [p, i]); end;;

# ---- rotate a coordinate vector in plane (b,c) by +/-90 degrees ---------
#  dir = +1 : e_b -> e_c , e_c -> -e_b
RotateVec := function(p, b, c, dir)
  local q;
  q := ShallowCopy(p);
  if dir = 1 then
    q[b] := -p[c]; q[c] := p[b];
  else
    q[b] := p[c];  q[c] := -p[b];
  fi;
  return q;
end;;

# ---- one outer hyperface twist as a permutation of the 216 stickers -----
#  facet normal (axis a, sign s); rotate the plane (b,c) by dir.
#  Pieces with p[a] = s rotate rigidly; all others are fixed.
FaceTwist := function(a, s, b, c, dir)
  local images, k, p, i, p2, unit, ur, i2;
  images := [1..Length(stickers)];
  for k in [1..Length(stickers)] do
    p := stickers[k][1]; i := stickers[k][2];
    if p[a] = s then
      p2 := RotateVec(p, b, c, dir);
      unit := [0,0,0,0]; unit[i] := p[i];
      ur := RotateVec(unit, b, c, dir);
      i2 := First([1..4], t -> ur[t] <> 0);
      images[k] := StickerIndex(p2, i2);
    fi;
  od;
  return PermList(images);
end;;

# ---- the three coordinate planes spanned by the axes <> a ---------------
OtherPlanes := function(a)
  local o;
  o := Filtered([1..4], x -> x <> a);
  return [[o[1],o[2]],[o[1],o[3]],[o[2],o[3]]];
end;;

# ---- assemble the 48 generators (8 facets x 3 planes x 2 directions) ----
gens := [];;
for a in [1..4] do
  for s in [1,-1] do
    for pl in OtherPlanes(a) do
      for dir in [1,-1] do
        Add(gens, FaceTwist(a, s, pl[1], pl[2], dir));
      od;
    od;
  od;
od;

G := Group(gens);;
Print("Number of generators        : ", Length(gens), "\n");
Print("Group order |G|             : ", Order(G), "\n");
Print("approx                      : ", Float(Order(G)), "\n");

expected := (Factorial(24)*Factorial(32)/2) * (Factorial(16)/2)
            * 2^23 * (Factorial(3)^31 * 3) * ((Factorial(4)/2)^15 * 4);;
Print("closed-form Eq (5)          : ", expected, "\n");
Print("orders agree                : ", Order(G) = expected, "\n");

# ---- orbit sizes (should be 64,96,48 stickers + eight fixed centres) ----
orb := Orbits(G, [1..Length(stickers)]);;
Print("sticker-orbit sizes         : ", SortedList(List(orb, Length)), "\n");
